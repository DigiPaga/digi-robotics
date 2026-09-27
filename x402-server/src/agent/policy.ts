import type { PaymentRequirements } from "@x402/core/types";
import { getAddress, isAddress, parseUnits } from "viem";
import type { AgentDemoEnv } from "../config/env";
import type { SafePaymentRequirements } from "../types/agentDemo";

export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}

export function displayAmountToAtomic(displayAmount: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new PolicyError("Token decimals are invalid");
  return parseUnits(displayAmount, decimals);
}

export function safeRequirements(requirements: PaymentRequirements): SafePaymentRequirements {
  return {
    scheme: requirements.scheme,
    network: requirements.network,
    asset: requirements.asset,
    amount: requirements.amount,
    payTo: requirements.payTo,
    maxTimeoutSeconds: requirements.maxTimeoutSeconds,
    assetTransferMethod: typeof requirements.extra?.assetTransferMethod === "string" ? requirements.extra.assetTransferMethod : undefined,
    paymentFlow: typeof requirements.extra?.paymentFlow === "string" ? requirements.extra.paymentFlow : undefined,
  };
}

export function validatePaymentPolicy(
  requirements: PaymentRequirements,
  resourceUrl: string,
  env: AgentDemoEnv,
): PaymentRequirements {
  if (requirements.network !== env.network) throw new PolicyError(`Network ${requirements.network} is not allowed`);
  if (requirements.scheme !== "exact") throw new PolicyError(`Scheme ${requirements.scheme} is not allowed`);
  if (!isAddress(requirements.asset) || getAddress(requirements.asset) !== env.assetAddress) {
    throw new PolicyError(`Asset ${requirements.asset} is not allowed`);
  }
  if (!isAddress(requirements.payTo) || !env.allowedPayTo.some(address => address === getAddress(requirements.payTo))) {
    throw new PolicyError(`Payment recipient ${requirements.payTo} is not allowlisted`);
  }

  const parsedUrl = new URL(resourceUrl);
  if (!env.allowedHosts.includes(parsedUrl.host.toLowerCase())) throw new PolicyError(`Resource host ${parsedUrl.host} is not allowlisted`);
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
    throw new PolicyError("Resource URL must use HTTPS outside localhost");
  }

  if (!/^\d+$/.test(requirements.amount)) throw new PolicyError("Payment amount is not an atomic integer");
  if (BigInt(requirements.amount) > env.maxSpendAtomic) throw new PolicyError("Payment amount exceeds the per-run spending cap");
  if (requirements.maxTimeoutSeconds * 1_000 > env.requestTimeoutMs) throw new PolicyError("Payment timeout exceeds the request policy");
  const transferMethod = requirements.extra?.assetTransferMethod ?? "eip3009";
  if (transferMethod !== "eip3009") throw new PolicyError(`Asset transfer method ${String(transferMethod)} is not allowed for this asset`);
  if (requirements.extra?.name !== env.assetName || requirements.extra?.version !== env.assetVersion) {
    throw new PolicyError("EIP-712 token domain does not match the configured asset");
  }
  const paymentFlow = requirements.extra?.paymentFlow ?? "authorization";
  if (paymentFlow !== "upfront") throw new PolicyError(`Payment flow ${String(paymentFlow)} is not the required settle-before-unlock flow`);

  return requirements;
}
