import type { FacilitatorContext, Network, PaymentPayload, PaymentRequirements, SchemeNetworkFacilitator, SettleResponse, VerifyResponse } from "@x402/core/types";
import { isEIP3009Payload, type ExactEvmPayloadV2, type FacilitatorEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { getAddress, isAddressEqual, keccak256, parseAbi, parseErc6492Signature, parseEventLogs, toBytes, type Address, type Hex } from "viem";

/** ABI subset of contracts/src/X402Facilitator.sol used by the server. */
export const x402FacilitatorAbi = parseAbi([
  "struct Authorization { address from; address to; uint256 value; uint256 validAfter; uint256 validBefore; bytes32 nonce; }",
  "function settle(bytes32 resourceId, Authorization auth, bytes signature)",
  "function token() view returns (address)",
  "function isSettler(address operator) view returns (bool)",
  "event PaymentSettled(bytes32 indexed resourceId, address indexed payer, address indexed payee, uint256 amount, bytes32 nonce, address settler)",
  "error UnauthorizedSettler(address caller)",
  "error ZeroAmount()",
  "error InvalidPayee(address payee)",
  "error SettlementAmountMismatch(uint256 expected, uint256 received)",
]);

/** The on-chain resource id: keccak256 of the canonical resource URL the server derived. */
export function resourceIdFor(resourceUrl: string): Hex {
  return keccak256(toBytes(resourceUrl));
}

/**
 * Reads the resource id the resource server put into the payment requirements' extra. The
 * requirements passed to settle are the server's own (matched against the client's echo), so
 * this value cannot be chosen by the payer. payload.resource is client-supplied and is never used.
 */
export function requiredResourceId(requirements: PaymentRequirements): Hex | undefined {
  const value = requirements.extra?.resourceId;
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value) ? value as Hex : undefined;
}

/**
 * x402 "exact" EVM facilitator scheme that settles EIP-3009 payments through the X402Facilitator
 * contract instead of calling the token directly.
 *
 * Verification is delegated unchanged to @x402/evm (signature, amount, recipient, validity
 * window, balance and an eth_call simulation against the token). Settlement re-verifies, then
 * submits X402Facilitator.settle, so the payment leaves a PaymentSettled event keyed by the
 * resource id in addition to the token's Transfer. The resource id comes from
 * requirements.extra.resourceId, set by the resource server; settlement fails without it.
 * Permit2 payloads are not accepted.
 */
export class SettlementContractScheme implements SchemeNetworkFacilitator {
  readonly scheme = "exact";
  readonly caipFamily = "eip155:*";
  private readonly contract: Address;
  private readiness?: Promise<string | undefined>;

  constructor(
    private readonly signer: FacilitatorEvmSigner,
    contract: string,
    private readonly inner: SchemeNetworkFacilitator = new ExactEvmScheme(signer),
  ) {
    this.contract = getAddress(contract);
  }

  getExtra(network: Network) {
    return this.inner.getExtra(network);
  }

  getSigners(network: string) {
    return this.inner.getSigners(network);
  }

  verify(payload: PaymentPayload, requirements: PaymentRequirements, context?: FacilitatorContext): Promise<VerifyResponse> {
    return this.inner.verify(payload, requirements, context);
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements, context?: FacilitatorContext): Promise<SettleResponse> {
    const network = requirements.network;
    const raw = payload.payload as ExactEvmPayloadV2;
    if (!isEIP3009Payload(raw) || !raw.signature) {
      return { success: false, errorReason: "unsupported_payload", errorMessage: "The settlement contract only accepts EIP-3009 authorizations", transaction: "", network };
    }
    const payer = getAddress(raw.authorization.from);
    const resourceId = requiredResourceId(requirements);
    if (!resourceId) {
      return { success: false, errorReason: "settlement_contract_misconfigured", errorMessage: "Payment requirements carry no server-derived extra.resourceId", transaction: "", network, payer };
    }

    const notReady = await this.checkContract(requirements.asset);
    if (notReady) return { success: false, errorReason: "settlement_contract_misconfigured", errorMessage: notReady, transaction: "", network, payer };

    const verification = await this.inner.verify(payload, requirements, context);
    if (!verification.isValid) {
      return { success: false, errorReason: verification.invalidReason ?? "invalid_payload", errorMessage: verification.invalidMessage, transaction: "", network, payer };
    }

    const auth = raw.authorization;
    const { signature } = parseErc6492Signature(raw.signature);
    let transaction: Hex;
    try {
      transaction = await this.signer.writeContract({
        address: this.contract,
        abi: x402FacilitatorAbi,
        functionName: "settle",
        args: [
          resourceId,
          {
            from: getAddress(auth.from),
            to: getAddress(auth.to),
            value: BigInt(auth.value),
            validAfter: BigInt(auth.validAfter),
            validBefore: BigInt(auth.validBefore),
            nonce: auth.nonce,
          },
          signature,
        ],
      });
    } catch (error) {
      return { success: false, errorReason: "transaction_failed", errorMessage: error instanceof Error ? error.message.split("\n")[0] : "settle() submission failed", transaction: "", network, payer };
    }

    let receipt: Awaited<ReturnType<FacilitatorEvmSigner["waitForTransactionReceipt"]>>;
    try {
      receipt = await this.signer.waitForTransactionReceipt({ hash: transaction });
    } catch {
      return { success: false, errorReason: "settlement_pending", errorMessage: "Settlement was broadcast but not confirmed in time", transaction, network, payer };
    }
    if (receipt.status !== "success") {
      return { success: false, errorReason: "transaction_reverted", transaction, network, payer };
    }
    const settled = parseEventLogs({ abi: x402FacilitatorAbi, eventName: "PaymentSettled", logs: [...(receipt.logs ?? [])] }).some(log =>
      isAddressEqual(log.address, this.contract)
      && isAddressEqual(log.args.payer, payer)
      && isAddressEqual(log.args.payee, getAddress(requirements.payTo))
      && log.args.amount === BigInt(requirements.amount)
      && log.args.nonce === auth.nonce,
    );
    if (!settled) {
      return { success: false, errorReason: "settlement_event_missing", errorMessage: "Receipt has no matching PaymentSettled event", transaction, network, payer };
    }
    return { success: true, transaction, network, payer, amount: requirements.amount };
  }

  /** One-time check that the contract settles the advertised asset and accepts this signer. */
  private async checkContract(asset: string): Promise<string | undefined> {
    this.readiness ??= (async () => {
      const [token, ...settlers] = await Promise.all([
        this.signer.readContract({ address: this.contract, abi: x402FacilitatorAbi, functionName: "token" }) as Promise<Address>,
        ...this.signer.getAddresses().map(address =>
          this.signer.readContract({ address: this.contract, abi: x402FacilitatorAbi, functionName: "isSettler", args: [address] }) as Promise<boolean>),
      ]);
      if (!isAddressEqual(token, getAddress(asset))) return `X402_SETTLEMENT_CONTRACT settles ${token}, not the advertised asset ${asset}`;
      if (!settlers.some(Boolean)) return "The facilitator signer is not an approved settler on X402_SETTLEMENT_CONTRACT";
      return undefined;
    })().catch(error => {
      this.readiness = undefined;
      return `Could not read X402_SETTLEMENT_CONTRACT: ${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}`;
    });
    return this.readiness;
  }
}
