import { Chain } from 'viem';

export const robinhoodTestnet: Chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['https://sepolia.rpc.robinhood.com'] 
    },
    public: { 
      http: ['https://sepolia.rpc.robinhood.com'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Robinhood Explorer', 
      url: 'https://explorer.robinhood.com' 
    },
  },
  testnet: true,
};

export const arbitrumSepolia: Chain = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['https://arbitrum-sepolia-rpc.publicnode.com'] 
    },
    public: { 
      http: ['https://arbitrum-sepolia-rpc.publicnode.com'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Arbiscan', 
      url: 'https://sepolia.arbiscan.io' 
    },
  },
  testnet: true,
};

export const supportedChains = [arbitrumSepolia, robinhoodTestnet] as const;
