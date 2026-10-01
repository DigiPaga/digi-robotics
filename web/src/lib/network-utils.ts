import type { Chain } from "viem";
import { supportedChains } from "@/lib/chains";

function networkChainId(network: string | number | undefined): number | undefined {
  if (typeof network === "number" && Number.isSafeInteger(network)) return network;
  if (typeof network !== "string") return undefined;
  const value = network.startsWith("eip155:") ? network.slice("eip155:".length) : network;
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function getSupportedChain(network: string | number | undefined): Chain | undefined {
  const chainId = networkChainId(network);
  return supportedChains.find((chain) => chain.id === chainId);
}

export function getNetworkDisplayName(network: string | number | undefined): string {
  return getSupportedChain(network)?.name ?? "Unsupported configured network";
}

export function getTransactionExplorerUrl(
  network: string | number | undefined,
  transactionHash: string | undefined,
): string | undefined {
  if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) return undefined;
  const explorer = getSupportedChain(network)?.blockExplorers?.default.url;
  return explorer ? `${explorer.replace(/\/$/, "")}/tx/${transactionHash}` : undefined;
}

export function isUsdGCompatibleSymbol(symbol: string | undefined): boolean {
  return typeof symbol === "string" && /usdg/i.test(symbol);
}

export function getAssetDisplayName(symbol: string | undefined): string {
  return isUsdGCompatibleSymbol(symbol) ? symbol as string : "Unsupported configured asset";
}
