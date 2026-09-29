import { createPublicClient, http } from 'viem';
import { robinhoodTestnet } from '../web/src/lib/chains';

async function validateRobinhoodConfig() {
  console.log('🔍 Validating Robinhood Chain Testnet configuration...');
  
  const client = createPublicClient({
    chain: robinhoodTestnet,
    transport: http(),
  });

  try {
    // Test RPC connection
    const chainId = await client.getChainId();
    console.log(`✅ Chain ID: ${chainId}`);
    
    if (chainId !== 46630) {
      throw new Error(`Expected chain ID 46630, got ${chainId}`);
    }

    // Test block number
    const blockNumber = await client.getBlockNumber();
    console.log(`✅ Current block: ${blockNumber}`);

    console.log('✅ Robinhood Chain Testnet configuration is valid!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

validateRobinhoodConfig();
