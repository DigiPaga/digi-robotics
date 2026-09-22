import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  
  blockchain: {
    arbitrumSepolia: {
      rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614,
    },
    robinhoodTestnet: {
      rpcUrl: process.env.ROBINHOOD_TESTNET_RPC || 'https://rpc.testnet.chain.robinhood.com',
      chainId: 46630,
    },
  },
  
  wallet: {
    privateKey: process.env.PRIVATE_KEY || '',
    address: process.env.DEPLOYER_ADDRESS || '',
  },
  
  ipfs: {
    pinataApiKey: process.env.PINATA_API_KEY || '',
    pinataSecretKey: process.env.PINATA_SECRET_KEY || '',
    pinataJwt: process.env.PINATA_JWT || '',
    gateway: 'https://gateway.pinata.cloud',
  },
  
  contracts: {
    agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '',
    marketplace: process.env.MARKETPLACE_ADDRESS || '',
  },
  
  zerodev: {
    projectId: process.env.ZERODEV_PROJECT_ID || '',
  },
} as const;

export default config;
