import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { createPublicClient, erc20Abi, formatUnits, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentDemoEnv } from "../config/env";
import type { UnlockedDataset } from "../types/agentDemo";
import { getX402Chain } from "../x402/chains";
import { validatePaymentPolicy } from "./policy";

const eip3009ProbeAbi = parseAbi([
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "function version() view returns (string)",
]);

export class BuyerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BuyerError";
  }
}

export class X402Buyer {
  readonly account;
  readonly publicClient;

  constructor(private readonly env: AgentDemoEnv) {
    if (!env.privateKey) throw new BuyerError("CONFIGURATION_ERROR", "No server-side buyer signer is configured");
    this.account = privateKeyToAccount(env.privateKey);
    this.publicClient = createPublicClient({
      chain: {
        id: env.chainId,
        name: getX402Chain(env.network)?.name ?? env.network,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [env.rpcUrl] } },
      },
      transport: http(env.rpcUrl),
    });
  }

  async preflight() {
    await this.publicClient.readContract({ address: this.env.assetAddress, abi: eip3009ProbeAbi, functionName: "authorizationState", args: [this.account.address, `0x${"00".repeat(32)}`] });
    const [decimals, name, version, symbol, balance, sellerBalance] = await Promise.all([
      this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "decimals" }),
      this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "name" }),
      this.publicClient.readContract({ address: this.env.assetAddress, abi: eip3009ProbeAbi, functionName: "version" }),
      this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "symbol" }),
      this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "balanceOf", args: [this.account.address] }),
      this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "balanceOf", args: [this.env.payTo] }),
    ]);
    if (decimals !== this.env.assetDecimals) throw new BuyerError("UNSUPPORTED_ASSET", `Configured decimals ${this.env.assetDecimals} do not match onchain decimals ${decimals}`);
    if (name !== this.env.assetName) throw new BuyerError("UNSUPPORTED_ASSET", `Configured EIP-712 name ${this.env.assetName} does not match onchain name ${name}`);
    if (version !== this.env.assetVersion) throw new BuyerError("UNSUPPORTED_ASSET", `Configured EIP-712 version ${this.env.assetVersion} does not match onchain version ${version}`);
    if (symbol !== this.env.assetSymbol) throw new BuyerError("UNSUPPORTED_ASSET", `Configured symbol ${this.env.assetSymbol} does not match onchain symbol ${symbol}`);
    if (balance < this.env.maxSpendAtomic) throw new BuyerError("INSUFFICIENT_BALANCE", `Agent balance ${formatUnits(balance, decimals)} ${symbol} is below the ${formatUnits(this.env.maxSpendAtomic, decimals)} ${symbol} policy cap`);
    if (this.env.mode === "REAL_MUSDG_X402") await this.preflightLocalSettlement();
    return { address: this.account.address, decimals, symbol, balance, balanceDisplay: formatUnits(balance, decimals), sellerBalance };
  }

  /**
   * REAL_MUSDG_X402 settles in-process, so this server also pays settlement gas and chooses the
   * payee. Fail before signing if either would lose or strand funds.
   */
  private async preflightLocalSettlement() {
    const payToCode = await this.publicClient.getCode({ address: this.env.payTo });
    if (payToCode && payToCode !== "0x") {
      throw new BuyerError("CONFIGURATION_ERROR", "X402_PAY_TO is a contract; REAL_MUSDG_X402 requires an EOA treasury that can move the received mUSDG");
    }
    if (!this.env.facilitatorPrivateKey) throw new BuyerError("CONFIGURATION_ERROR", "X402_FACILITATOR_PRIVATE_KEY is not configured");
    const facilitator = privateKeyToAccount(this.env.facilitatorPrivateKey).address;
    const gasBalance = await this.publicClient.getBalance({ address: facilitator });
    if (gasBalance === 0n) throw new BuyerError("CONFIGURATION_ERROR", `Facilitator signer ${facilitator} has no native ETH to pay settlement gas`);
  }

  async requestUnpaid(resourceUrl: string): Promise<{ paymentRequired: PaymentRequired; requirement: PaymentRequirements }> {
    const response = await this.boundedFetch(resourceUrl);
    if (response.status !== 402) throw new BuyerError("INVALID_PAYMENT_REQUIREMENTS", `Expected HTTP 402, received ${response.status}`);
    const header = response.headers.get("payment-required") ?? response.headers.get("x-payment-required");
    if (!header) throw new BuyerError("INVALID_PAYMENT_REQUIREMENTS", "HTTP 402 response omitted PAYMENT-REQUIRED");
    const paymentRequired = decodePaymentRequiredHeader(header);
    const requirement = paymentRequired.accepts[0];
    if (!requirement) throw new BuyerError("INVALID_PAYMENT_REQUIREMENTS", "HTTP 402 response offered no payment requirements");
    return { paymentRequired, requirement };
  }

  async payAndUnlock(
    resourceUrl: string,
    paymentRequired: PaymentRequired,
    onSigned: () => void,
    onRetry: () => void,
  ): Promise<{ unlocked: UnlockedDataset; receipt: ReturnType<typeof decodePaymentResponseHeader>; sellerBalance: bigint }> {
    const client = new x402Client((_version, requirements) => {
      const requirement = requirements[0];
      if (!requirement) throw new BuyerError("INVALID_PAYMENT_REQUIREMENTS", "No compatible requirements remain after x402 filtering");
      return validatePaymentPolicy(requirement, resourceUrl, this.env);
    }).register(this.env.network, new ExactEvmScheme(this.account));
    client.setSpendControls({
      maxAmountPerPayment: false,
      allowedAssets: [{ network: this.env.network, asset: this.env.assetAddress, maxAmountPerPayment: this.env.maxSpendAtomic.toString() }],
    });
    const httpClient = new x402HTTPClient(client);
    const payload = await httpClient.createPaymentPayload(paymentRequired);
    onSigned();
    const headers = httpClient.encodePaymentSignatureHeader(payload);
    onRetry();
    const response = await this.boundedFetch(resourceUrl, { headers: { ...headers, Accept: "application/json" } });
    if (!response.ok) {
      const body = await response.text();
      throw new BuyerError("SETTLEMENT_FAILURE", `Paid resource returned ${response.status}: ${body.slice(0, 240)}`);
    }
    const responseHeader = response.headers.get("payment-response") ?? response.headers.get("x-payment-response");
    if (!responseHeader) throw new BuyerError("SETTLEMENT_FAILURE", "Paid response omitted PAYMENT-RESPONSE settlement evidence");
    const receipt = decodePaymentResponseHeader(responseHeader);
    if (!receipt.success || !/^0x[0-9a-fA-F]{64}$/.test(receipt.transaction)) {
      throw new BuyerError("SETTLEMENT_FAILURE", receipt.errorMessage ?? receipt.errorReason ?? "Facilitator did not return a successful transaction");
    }
    const unlocked = await response.json() as UnlockedDataset;
    if (!unlocked.signedUrl || unlocked.payment.transactionHash.toLowerCase() !== receipt.transaction.toLowerCase()) {
      throw new BuyerError("CONTENT_FAILURE", "Unlocked response did not bind access to the facilitator settlement receipt");
    }
    const chainReceipt = await this.publicClient.getTransactionReceipt({ hash: receipt.transaction as `0x${string}` });
    if (chainReceipt.status !== "success") throw new BuyerError("SETTLEMENT_FAILURE", "Settlement transaction reverted onchain");
    const sellerBalance = await this.publicClient.readContract({ address: this.env.assetAddress, abi: erc20Abi, functionName: "balanceOf", args: [this.env.payTo] });
    return { unlocked, receipt, sellerBalance };
  }

  private async boundedFetch(resourceUrl: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(resourceUrl);
    if (!this.env.allowedHosts.includes(url.host.toLowerCase())) throw new BuyerError("POLICY_REJECTED", `Host ${url.host} is not allowlisted`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.env.requestTimeoutMs);
    try {
      const response = await fetch(url, { ...init, redirect: "manual", signal: controller.signal, headers: { Accept: "application/json", ...init.headers } });
      if (response.status >= 300 && response.status < 400) throw new BuyerError("POLICY_REJECTED", "Redirects are disabled for autonomous purchases");
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new BuyerError("TIMEOUT", "Resource request exceeded the configured timeout");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
