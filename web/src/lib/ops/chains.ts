import { defineChain, type Chain } from "viem";

/**
 * Chains the ops dashboard reads and the top-up panel may send on.
 * Testnets only. Public configuration, safe for the client bundle.
 */
export const opsArbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] } },
  blockExplorers: { default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" } },
  testnet: true,
});

export const opsRobinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
});

export const OPS_CHAINS = [opsArbitrumSepolia, opsRobinhoodTestnet] as const;
export type OpsChainId = (typeof OPS_CHAINS)[number]["id"];

export function getOpsChain(chainId: number): Chain | null {
  return OPS_CHAINS.find((chain) => chain.id === chainId) ?? null;
}

/** Top-up guard: only the two testnets above. Anything else, including mainnets, is refused. */
export function assertTopUpChain(chainId: number): Chain {
  const chain = getOpsChain(chainId);
  if (!chain || chain.testnet !== true) {
    throw new Error(`Chain ${chainId} is not an allowed top-up network. Only Arbitrum Sepolia and Robinhood Chain Testnet are allowed.`);
  }
  return chain;
}

export function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}`;
}

/** EIP-3085 params for wallet_addEthereumChain. */
export function addChainParams(chain: Chain) {
  return {
    chainId: toHexChainId(chain.id),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: [...chain.rpcUrls.default.http],
    blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
  };
}

export function explorerAddressUrl(chain: Chain, address: string): string {
  return `${chain.blockExplorers?.default.url ?? ""}/address/${address}`;
}

export function explorerTxUrl(chain: Chain, hash: string): string {
  return `${chain.blockExplorers?.default.url ?? ""}/tx/${hash}`;
}
