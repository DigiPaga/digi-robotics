import { getAddress, isAddress } from 'viem';

export interface StablecoinConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

/** Marks a chain whose MockUSDG address has not been configured yet. */
export const UNCONFIGURED_TOKEN = '0x0000000000000000000000000000000000000000';

/** First MockUSDG on Arbitrum Sepolia: plain ERC-20, enough for the transfer() checkout, no EIP-3009. */
const LEGACY_ARBITRUM_SEPOLIA_MOCK_USDG = '0x39271d08C111912B1F32465745f3123a878C83Bb';

function configuredAddress(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && isAddress(trimmed) ? getAddress(trimmed) : fallback;
}

// USDG only on every chain (Paxos USDG on mainnet, MockUSDG on testnets). Addresses come from
// contracts/deployments/x402-<chainId>.json after DeployX402.s.sol and are set per chain in env.
// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them.
const MOCK_USDG = { decimals: 6, symbol: 'mUSDG', name: 'Mock USDG (Demo)' } as const;

export const stablecoinConfig: Record<number, StablecoinConfig> = {
  // Arbitrum Sepolia
  421614: {
    ...MOCK_USDG,
    address: configuredAddress(
      // `||` on the trimmed value: an empty or blank per-chain variable (common in .env templates)
      // must fall through to the generic one instead of shadowing it.
      process.env.NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA?.trim() || process.env.NEXT_PUBLIC_MOCK_USDG_ADDRESS,
      LEGACY_ARBITRUM_SEPOLIA_MOCK_USDG,
    ),
  },
  // Robinhood Chain Testnet
  46630: {
    ...MOCK_USDG,
    address: configuredAddress(process.env.NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD, UNCONFIGURED_TOKEN),
  },
};

export const getStablecoinConfig = (chainId: number): StablecoinConfig => {
  const config = stablecoinConfig[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
};
