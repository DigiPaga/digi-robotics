import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY as ;

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
  account: PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : undefined,
});

export interface SettlementRequest {
  assetId: number;
  buyer: string;
  agent: string;
  amount: bigint;
  tokenAddress: string;
}

export const settleOnArbitrum = async (request: SettlementRequest): Promise<string> => {
  try {
      throw new Error('Wallet client not configured');
    }

    // In production, this would call the X402Facilitator contract
    // For now, we simulate the settlement
    
    const txHash = await walletClient.sendTransaction({
      to: request.buyer as ,
      value: 0n, // USDC transfer would use contract call
    });

    console.log();
    return txHash;
  } catch (error) {
    console.error('Arbitrum settlement failed:', error);
    throw new Error('Failed to settle on Arbitrum');
  }
};

export const verifyTransaction = async (txHash: string): Promise<boolean> => {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as ,
    });
    return receipt.status === 'success';
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return false;
  }
};

export const getBlockNumber = async (): Promise<bigint> => {
  return await publicClient.getBlockNumber();
};
