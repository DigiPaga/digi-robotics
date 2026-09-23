import { createPublicClient, http, parseGwei } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import logger from './logger';

/**
 * Arbitrum L2 Gas Estimator
 * Accounts for both L2 execution gas and L1 calldata fee (Nitro stack).
 * Based on Arbitrum DApp Skill recommendations.
 */

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'),
});

export const estimateArbitrumGas = async (
  account: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`
): Promise<bigint> => {
  try {
    // 1. Estimate L2 execution gas
    const l2Gas = await publicClient.estimateGas({
      account,
      to,
      data,
    });

    // 2. Get current L2 base fee
    const feeData = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas || parseGwei('0.1');

    // 3. Add 20% buffer for L1 data fee fluctuations (Arbitrum specific)
    const bufferedGas = (l2Gas * 120n) / 100n;
    const estimatedCostWei = bufferedGas * maxFeePerGas;

    logger.info('Arbitrum L2 gas estimated', { 
      l2Gas: l2Gas.toString(), 
      bufferedGas: bufferedGas.toString(),
      estimatedCostWei: estimatedCostWei.toString() 
    });

    return estimatedCostWei;
  } catch (error) {
    logger.error('Failed to estimate Arbitrum gas', error);
    throw new Error('Gas estimation failed');
  }
};
