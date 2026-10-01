/**
 * Chains the agent demo knows how to pay on, keyed by CAIP-2 network id.
 *
 * Base Sepolia is the REAL_X402_TEST_ASSET rail (test USDC through the public x402.org
 * facilitator). Arbitrum Sepolia and Robinhood Chain Testnet are the REAL_MUSDG_X402 rails
 * (MockUSDG with EIP-3009, settled by the in-process facilitator).
 */
export interface X402Chain {
  network: `eip155:${number}`;
  chainId: number;
  name: string;
  defaultRpcUrl: string;
  explorerUrl: string;
  supportsMockUsdg: boolean;
}

export const X402_CHAINS: Record<string, X402Chain> = {
  "eip155:84532": {
    network: "eip155:84532",
    chainId: 84_532,
    name: "Base Sepolia",
    defaultRpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    supportsMockUsdg: false,
  },
  "eip155:421614": {
    network: "eip155:421614",
    chainId: 421_614,
    name: "Arbitrum Sepolia",
    defaultRpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    supportsMockUsdg: true,
  },
  "eip155:46630": {
    network: "eip155:46630",
    chainId: 46_630,
    name: "Robinhood Chain Testnet",
    defaultRpcUrl: "https://rpc.testnet.chain.robinhood.com",
    explorerUrl: "https://explorer.testnet.chain.robinhood.com",
    supportsMockUsdg: true,
  },
};

/** EIP-712 domain and metadata of contracts/src/MockUSDG.sol. */
export const MOCK_USDG_TOKEN = {
  name: "Mock USDG (Demo)",
  version: "1",
  symbol: "mUSDG",
  decimals: 6,
} as const;

export function getX402Chain(network: string): X402Chain | undefined {
  return X402_CHAINS[network];
}

export function explorerTxUrl(network: string, hash: string): string | undefined {
  const chain = getX402Chain(network);
  return chain ? `${chain.explorerUrl}/tx/${hash}` : undefined;
}
