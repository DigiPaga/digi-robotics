import { parseEther, type Chain } from "viem";
import { addChainParams, assertTopUpChain, toHexChainId } from "./chains";

export const TOPUP_PRESETS = ["0.001", "0.005", "0.01"] as const;
/** Sanity cap for a single testnet top-up. */
export const MAX_TOPUP_ETH = "0.5";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface Eip6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

/** Parses a user-entered ETH amount. Throws a user-facing message on anything unusable. */
export function parseTopUpAmount(input: string): bigint {
  const value = input.trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(value)) throw new Error("Enter an ETH amount like 0.005.");
  let wei: bigint;
  try {
    wei = parseEther(value.endsWith(".") ? value.slice(0, -1) : value);
  } catch {
    throw new Error("Enter an ETH amount with at most 18 decimals.");
  }
  if (wei <= BigInt(0)) throw new Error("Amount must be greater than zero.");
  if (wei > parseEther(MAX_TOPUP_ETH)) throw new Error(`Top-ups are capped at ${MAX_TOPUP_ETH} ETH.`);
  return wei;
}

function errorCode(error: unknown): number | string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "number" || typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function errorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const { message, shortMessage, details, name } = current as Record<string, unknown>;
    for (const value of [name, shortMessage, message, details]) if (typeof value === "string") parts.push(value);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" ").toLowerCase();
}

/** User-facing message for a failed top-up. */
export function describeTopUpError(error: unknown): string {
  const code = errorCode(error);
  const text = errorText(error);
  if (code === 4001 || code === "ACTION_REJECTED" || text.includes("user rejected") || text.includes("user denied")) {
    return "You rejected the request in your wallet. Nothing was sent.";
  }
  if (code === 4902 || text.includes("unrecognized chain")) {
    return "Your wallet does not know this network and could not add it. Add it manually and try again.";
  }
  if (text.includes("insufficient funds") || text.includes("exceeds the balance") || text.includes("exceeds balance")) {
    return "The connected wallet does not have enough ETH for this amount plus gas.";
  }
  if (text.includes("chain mismatch") || text.includes("chainmismatch") || text.includes("wrong network") || text.includes("not an allowed top-up network")) {
    return "Your wallet is on the wrong network. Switch to the selected testnet and try again.";
  }
  if (code === -32002) return "Your wallet already has a pending request. Open it and finish or dismiss that first.";
  if (error instanceof Error && error.message && error.message.length < 160) return error.message;
  return "The top-up failed. Check your wallet and try again.";
}

function isUnknownChainError(error: unknown): boolean {
  const code = errorCode(error);
  // 4902 is the standard code; some wallets wrap it as -32603 with the 4902 in data.
  return code === 4902 || errorText(error).includes("unrecognized chain") || errorText(error).includes("4902");
}

export async function readChainId(provider: Eip1193Provider): Promise<number> {
  const raw = await provider.request({ method: "eth_chainId" });
  return typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
}

/**
 * Switches the wallet to an allowed testnet, adding it on 4902, then confirms
 * the wallet really is on that chain. Refuses any chain outside the ops list.
 */
export async function ensureTopUpChain(provider: Eip1193Provider, chainId: number): Promise<Chain> {
  const chain = assertTopUpChain(chainId);
  if ((await readChainId(provider)) !== chain.id) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: toHexChainId(chain.id) }] });
    } catch (error) {
      if (!isUnknownChainError(error)) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [addChainParams(chain)] });
    }
  }
  const current = await readChainId(provider);
  if (current !== chain.id) throw new Error(`Wrong network: wallet is on chain ${current}, expected ${chain.name}.`);
  return chain;
}
