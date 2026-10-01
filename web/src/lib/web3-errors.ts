export type Web3ErrorCode =
  | "USER_REJECTED_WALLET"
  | "USER_REJECTED_SIGNATURE"
  | "INSUFFICIENT_ASSET_BALANCE"
  | "INSUFFICIENT_GAS"
  | "WRONG_NETWORK"
  | "UNSUPPORTED_CHAIN"
  | "UNSUPPORTED_ASSET"
  | "WALLET_NOT_CONNECTED"
  | "SMART_ACCOUNT_INITIALIZATION_FAILED"
  | "RPC_UNAVAILABLE"
  | "REQUEST_TIMEOUT"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_REPLACED"
  | "TRANSACTION_CANCELLED"
  | "RECEIPT_FAILED"
  | "X402_PAYMENT_REJECTED"
  | "X402_SETTLEMENT_FAILED"
  | "PROTECTED_RESOURCE_LOCKED"
  | "UNKNOWN";

export interface Web3ErrorContext {
  expectedNetwork?: string;
  assetSymbol?: string;
  rejectionKind?: "wallet" | "signature";
  operation?: "checkout" | "x402" | "wallet" | "transaction";
}

export interface NormalizedWeb3Error {
  code: Web3ErrorCode;
  message: string;
  retryable: boolean;
  original: unknown;
}

interface ErrorShape {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  details?: unknown;
  reason?: unknown;
  cause?: unknown;
}

const MAX_CAUSE_DEPTH = 5;

function isErrorShape(value: unknown): value is ErrorShape {
  return typeof value === "object" && value !== null;
}

function collectErrorSignals(error: unknown): { text: string; codes: string[]; names: string[] } {
  const text: string[] = [];
  const codes: string[] = [];
  const names: string[] = [];
  const seen = new Set<unknown>();
  let current = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);

    if (typeof current === "string") {
      text.push(current);
      break;
    }
    if (!isErrorShape(current)) break;

    for (const value of [current.message, current.shortMessage, current.details, current.reason]) {
      if (typeof value === "string") text.push(value);
    }
    if (typeof current.code === "string" || typeof current.code === "number") {
      codes.push(String(current.code).toLowerCase());
    }
    if (typeof current.name === "string") names.push(current.name.toLowerCase());
    current = current.cause;
  }

  return { text: text.join(" ").toLowerCase(), codes, names };
}

function includesAny(value: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function result(
  code: Web3ErrorCode,
  message: string,
  retryable: boolean,
  original: unknown,
): NormalizedWeb3Error {
  return { code, message, retryable, original };
}

export function normalizeWeb3Error(
  error: unknown,
  context: Web3ErrorContext = {},
): NormalizedWeb3Error {
  const { text, codes, names } = collectErrorSignals(error);
  const codeText = codes.join(" ");
  const nameText = names.join(" ");
  const asset = context.assetSymbol?.trim() || "USDG-compatible test asset";

  const rejected = codes.includes("4001") || codes.includes("action_rejected") ||
    includesAny(nameText, ["userrejected", "user_rejected", "rejectedrequest"]) ||
    includesAny(text, ["user rejected", "user denied", "request rejected", "declined by user"]);
  if (rejected) {
    return context.rejectionKind === "wallet"
      ? result("USER_REJECTED_WALLET", "Wallet connection was cancelled. Connect when you’re ready.", true, error)
      : result("USER_REJECTED_SIGNATURE", "The signature request was declined. No transaction was completed.", true, error);
  }

  if (includesAny(codeText, ["insufficient_balance", "insufficient_asset"]) ||
    (includesAny(text, ["insufficient", "exceeds balance"]) && includesAny(text, ["token", "balance", "usdg"]))) {
    return result("INSUFFICIENT_ASSET_BALANCE", `This wallet does not have enough ${asset} for the payment.`, true, error);
  }

  if (includesAny(text, ["insufficient funds for gas", "insufficient native", "gas sponsorship failed", "paymaster rejected"]) ||
    includesAny(codeText, ["insufficient_funds", "paymaster_rejected"])) {
    return result("INSUFFICIENT_GAS", "Gas sponsorship is unavailable and the wallet does not have enough native gas balance.", true, error);
  }

  if (includesAny(codeText, ["chain_mismatch", "wrong_network", "4902"]) ||
    includesAny(nameText, ["chainmismatch", "switchethereumchain"]) ||
    includesAny(text, ["wrong network", "chain mismatch", "switch network"])) {
    const suffix = context.expectedNetwork ? ` Switch to ${context.expectedNetwork} to continue.` : " Switch to the network required for this action.";
    return result("WRONG_NETWORK", `Your wallet is connected to the wrong network.${suffix}`, true, error);
  }

  if (includesAny(codeText, ["unsupported_network", "unsupported_chain"]) || includesAny(text, ["unsupported chain", "network is not supported"])) {
    return result("UNSUPPORTED_CHAIN", context.expectedNetwork
      ? `${context.expectedNetwork} is required for this action, but the wallet does not support it.`
      : "The selected network is not supported for this action.", false, error);
  }

  if (includesAny(codeText, ["unsupported_asset"]) || includesAny(text, ["usdg-compatible asset is not configured"])) {
    const network = context.expectedNetwork ? ` for ${context.expectedNetwork}` : "";
    return result("UNSUPPORTED_ASSET", `Checkout is unavailable until a USDG-compatible test asset is configured${network}.`, false, error);
  }

  if (includesAny(codeText, ["wallet_not_connected", "disconnected"]) || includesAny(text, ["wallet not connected", "connect a wallet", "no active account"])) {
    return result("WALLET_NOT_CONNECTED", "Connect your wallet before continuing.", true, error);
  }

  if (includesAny(codeText, ["smart_account_initialization_failed"]) ||
    includesAny(text, ["kernel account", "smart account", "ecdsa validator", "zerodev is not configured"])) {
    return result("SMART_ACCOUNT_INITIALIZATION_FAILED", "The smart account could not be prepared. Check the wallet connection and try again.", true, error);
  }

  if (includesAny(codeText, ["timeout", "etimedout", "abort_err"]) || includesAny(nameText, ["timeouterror", "aborterror"]) || includesAny(text, ["timed out", "timeout"])) {
    return result("REQUEST_TIMEOUT", "The request timed out. Check the latest status before trying again.", true, error);
  }

  if (includesAny(codeText, ["rpc_unavailable", "network_error"]) ||
    includesAny(text, ["rpc unavailable", "failed to fetch", "network request failed", "service unavailable", "could not connect"])) {
    return result("RPC_UNAVAILABLE", "The network service is temporarily unavailable. Try again shortly.", true, error);
  }

  if (includesAny(codeText, ["transaction_cancelled"]) || includesAny(text, ["transaction cancelled", "replacement transaction underpriced"])) {
    return result("TRANSACTION_CANCELLED", "The transaction was cancelled before confirmation.", true, error);
  }

  if (includesAny(codeText, ["transaction_replaced"]) || includesAny(text, ["transaction replaced", "repriced transaction"])) {
    return result("TRANSACTION_REPLACED", "The transaction was replaced. Check the replacement before continuing.", true, error);
  }

  if (includesAny(codeText, ["receipt_failed"]) || includesAny(text, ["receipt status failed", "transaction receipt failed", "did not succeed"])) {
    return result("RECEIPT_FAILED", "The transaction was included but did not succeed. No payment confirmation was recorded.", false, error);
  }

  if (includesAny(nameText, ["contractfunctionreverted", "transactionexecutionerror"]) || includesAny(text, ["execution reverted", "transaction reverted", "reverted with"])) {
    return result("TRANSACTION_REVERTED", "The transaction was reverted. Review the payment details before retrying.", true, error);
  }

  if (includesAny(codeText, ["policy_rejected", "invalid_payment_requirements"]) || includesAny(text, ["payment rejected", "policy rejected"])) {
    return result("X402_PAYMENT_REJECTED", "The x402 payment requirements did not pass the agent’s safety policy.", false, error);
  }

  if (includesAny(codeText, ["facilitator_failure", "settlement_failure"]) || includesAny(text, ["settlement failed", "facilitator failure"])) {
    return result("X402_SETTLEMENT_FAILED", "Settlement could not be verified. Check the run status before starting another payment.", true, error);
  }

  if (includesAny(codeText, ["content_failure", "resource_locked"]) || includesAny(text, ["resource still locked", "content remains locked", "unlock failed"])) {
    return result("PROTECTED_RESOURCE_LOCKED", "Payment access is not verified, so the protected resource remains locked.", true, error);
  }

  return result("UNKNOWN", "Something interrupted this action. Your funds and access status have not been assumed; please check the latest state and try again.", true, error);
}
