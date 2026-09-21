'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from \'wagmi\';
import { parseAbi } from \'viem\';

const MARKETPLACE_ABI = parseAbi([
  \'function listAsset(string calldata ipfsURI, uint256 price) external\',
  \'function purchaseWithAgent(uint256 assetId, address agentAddress) external\',
  \'function getAsset(uint256 assetId) external view returns (tuple(uint256 id, address seller, string ipfsURI, uint256 price, bool isSold, uint256 createdAt))\',
  \'function totalAssets() external view returns (uint256)\',
]);

export function useMarketplace(contractAddress: `0x${string}` | undefined) {
  const { data: totalAssets, isLoading: isLoadingTotal } = useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_ABI,
    functionName: \'totalAssets\',
    query: { enabled: # 5. Hook de React para MarketplacecontractAddress },
  });

  const { writeContract: writeList, data: listHash, isPending: isListing } = useWriteContract();
  const { writeContract: writePurchase, data: purchaseHash, isPending: isPurchasing } = useWriteContract();

  const { isSuccess: isListed } = useWaitForTransactionReceipt({ hash: listHash });
  const { isSuccess: isPurchased } = useWaitForTransactionReceipt({ hash: purchaseHash });

  const listAsset = (ipfsURI: string, price: bigint) => {
    writeList({
      address: contractAddress,
      abi: MARKETPLACE_ABI,
      functionName: \'listAsset\',
      args: [ipfsURI, price],
    });
  };

  const purchaseWithAgent = (assetId: bigint, agentAddress: `0x${string}`) => {
    writePurchase({
      address: contractAddress,
      abi: MARKETPLACE_ABI,
      functionName: \'purchaseWithAgent\',
      args: [assetId, agentAddress],
    });
  };

  return {
    totalAssets,
    isLoadingTotal,
    listAsset,
    isListing,
    isListed,
    purchaseWithAgent,
    isPurchasing,
    isPurchased,
  };
}
