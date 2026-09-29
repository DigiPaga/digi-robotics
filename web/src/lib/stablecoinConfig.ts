export interface StablecoinConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export const stablecoinConfig: Record<number, StablecoinConfig> = {
  // Arbitrum Sepolia
  421614: {
    address: '0x75faf114eafb1BDbe4F43213Fe49D7C47aA714B3', // USDC on Arb Sepolia
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  // Robinhood Chain Testnet
  46630: {
    address: '0x0000000000000000000000000000000000000000', // TODO: Deploy MockUSDG on Robinhood
    decimals: 6,
    symbol: 'mUSDG',
    name: 'Mock USDG',
  },
};

export const getStablecoinConfig = (chainId: number): StablecoinConfig => {
  const config = stablecoinConfig[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
};
