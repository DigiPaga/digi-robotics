import { createPublicClient, http, parseAbi, erc20Abi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import config from '../config';
import logger from '../utils/logger';

// USDC ABI (subset)
const USDC_ABI = [
  ...erc20Abi,
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(config.blockchain.arbitrumSepolia.rpcUrl),
});

// USDC address on Arbitrum Sepolia
const USDC_ADDRESS = '0x75faF114eAfb1bDbE4F43213fE49d7C47Aa714b3';

export const usdc = {
  async balanceOf(address: string): Promise<bigint> {
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });
      return balance;
    } catch (error) {
      logger.error('Failed to get USDC balance', error);
      return 0n;
    }
  },

  async approve(spender: string, amount: bigint): Promise<boolean> {
    // This would require wallet client for actual approval
    logger.info('USDC approval requested', { spender, amount });
    return true;
  },
};

export default usdc;
