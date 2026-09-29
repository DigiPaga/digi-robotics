export const NETWORK_CONFIG = {
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com",
  },
  ROBINHOOD_TESTNET: {
    chainId: 46630,
    rpcUrl: process.env.ROBINHOOD_RPC_URL || "https://sepolia.rpc.robinhood.com",
  },
} as const;

export type NetworkKey = keyof typeof NETWORK_CONFIG;
