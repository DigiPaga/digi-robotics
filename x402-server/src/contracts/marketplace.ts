import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import config from '../config';
import logger from '../utils/logger';

const MARKETPLACE_ABI = parseAbi([
  'function listAsset(string calldata ipfsURI, uint256 price) external',
  'function purchaseWithAgent(uint256 assetId, address agentAddress) external',
  'function getAsset(uint256 assetId) external view returns (tuple(uint256 id, address seller, string ipfsURI, uint256 price, bool isSold, uint256 createdAt))',
  'function totalAssets() external view returns (uint256)',
]);

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(config.blockchain.arbitrumSepolia.rpcUrl),
});

const walletClient = config.wallet.privateKey
  ? createWalletClient({
      chain: arbitrumSepolia,
      transport: http(config.blockchain.arbitrumSepolia.rpcUrl),
      account: privateKeyToAccount(config.wallet.privateKey as `0x${string}`),
    })
  : null;

export const marketplace = {
  async totalAssets(): Promise<number> {
    try {
      const result = await publicClient.readContract({
        address: config.contracts.marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'totalAssets',
      });
      return Number(result);
    } catch (error) {
      logger.error('Failed to get total assets', error);
      return 0;
    }
  },

  async getAsset(assetId: number) {
    try {
      const result = await publicClient.readContract({
        address: config.contracts.marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'getAsset',
        args: [BigInt(assetId)],
      });
      return result;
    } catch (error) {
      logger.error('Failed to get asset', error);
      return null;
    }
  },

  async listAsset(ipfsURI: string, priceUSDC: string): Promise<string | null> {
      logger.error('Wallet client not configured');
      return null;
    }

    try {
      const price = parseUnits(priceUSDC, 6); // USDC has 6 decimals
      
      const hash = await walletClient.writeContract({
        address: config.contracts.marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'listAsset',
        args: [ipfsURI, price],
      });

      logger.success('Asset listed', { hash, ipfsURI, price: priceUSDC });
      return hash;
    } catch (error) {
      logger.error('Failed to list asset', error);
      return null;
    }
  },
};

export default marketplace;
