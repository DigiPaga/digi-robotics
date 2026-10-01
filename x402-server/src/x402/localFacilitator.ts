import { x402Facilitator } from "@x402/core/facilitator";
import type { FacilitatorClient } from "@x402/core/server";
import type { Network, SchemeNetworkFacilitator, SupportedResponse } from "@x402/core/types";
import { toFacilitatorEvmSigner, type FacilitatorEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { createWalletClient, defineChain, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentDemoEnv } from "../config/env";
import { getX402Chain } from "./chains";
import { SettlementContractScheme } from "./settlementContractScheme";

/** Leave headroom under the buyer's request timeout so a slow receipt surfaces as pending, not as a dropped socket. */
const RECEIPT_HEADROOM_MS = 5_000;

/**
 * Builds the x402 facilitator signer: a viem wallet on the configured chain that pays gas for
 * settlement. Its key never leaves this process and never signs payment authorizations.
 */
export function createFacilitatorSigner(env: AgentDemoEnv): FacilitatorEvmSigner {
  if (!env.facilitatorPrivateKey) throw new Error("X402_FACILITATOR_PRIVATE_KEY is required for the local facilitator");
  const account = privateKeyToAccount(env.facilitatorPrivateKey);
  const chain = defineChain({
    id: env.chainId,
    name: getX402Chain(env.network)?.name ?? env.network,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [env.rpcUrl] } },
  });
  const client = createWalletClient({ account, chain, transport: http(env.rpcUrl) }).extend(publicActions);
  return toFacilitatorEvmSigner(
    {
      address: account.address,
      getCode: args => client.getCode(args),
      readContract: args => client.readContract({ ...args, args: args.args ?? [] } as Parameters<typeof client.readContract>[0]),
      verifyTypedData: args => client.verifyTypedData(args as Parameters<typeof client.verifyTypedData>[0]),
      writeContract: args => client.writeContract({ ...args, args: args.args ?? [] } as Parameters<typeof client.writeContract>[0]),
      sendTransaction: args => client.sendTransaction(args),
      waitForTransactionReceipt: args => client.waitForTransactionReceipt(args),
    },
    { confirmationTimeoutMs: Math.max(env.requestTimeoutMs - RECEIPT_HEADROOM_MS, 5_000) },
  );
}

/**
 * In-process x402 facilitator for REAL_MUSDG_X402. The public x402.org facilitator does not serve
 * Arbitrum Sepolia or Robinhood Chain Testnet, so the resource server verifies and settles the
 * EIP-3009 authorization itself with the standard @x402/evm exact scheme. When
 * X402_SETTLEMENT_CONTRACT is set, settlement goes through the X402Facilitator contract instead
 * of straight to the token.
 */
export function createLocalFacilitator(env: AgentDemoEnv, scheme?: SchemeNetworkFacilitator): FacilitatorClient {
  if (!scheme) {
    const signer = createFacilitatorSigner(env);
    scheme = env.settlementContract ? new SettlementContractScheme(signer, env.settlementContract) : new ExactEvmScheme(signer);
  }
  const facilitator = new x402Facilitator().register(env.network, scheme);
  return {
    verify: (payload, requirements) => facilitator.verify(payload, requirements),
    settle: (payload, requirements) => facilitator.settle(payload, requirements),
    getSupported: async (): Promise<SupportedResponse> => {
      const supported = facilitator.getSupported();
      return { ...supported, kinds: supported.kinds.map(kind => ({ ...kind, network: kind.network as Network })) };
    },
  };
}
