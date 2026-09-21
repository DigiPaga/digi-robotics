'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from \'wagmi\';
import { parseAbi } from \'viem\';

const AGENT_REGISTRY_ABI = parseAbi([
  \'function registerAgent(address agentAddress, string calldata agentType, string calldata metadataURI) external returns (uint256)\',
  \'function isAgentActive(address agentAddress) external view returns (bool)\',
  \'function getAgentIdentity(address agentAddress) external view returns (tuple(address agentAddress, address owner, string agentType, string metadataURI, bool isActive, uint256 registeredAt))\',
]);

export function useAgentRegistry(contractAddress: `0x${string}` | undefined) {
  const { data: isActive, isLoading: isLoadingActive } = useReadContract({
    address: contractAddress,
    abi: AGENT_REGISTRY_ABI,
    functionName: \'isAgentActive\',
    args: contractAddress ? [contractAddress] : undefined,
    query: { enabled: # 4. Hook de React para AgentRegistrycontractAddress },
  });

  const { writeContract, data: hash, isPending: isRegistering } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isRegistered } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAgent = (agentAddress: `0x${string}`, agentType: string, metadataURI: string) => {
    writeContract({
      address: contractAddress,
      abi: AGENT_REGISTRY_ABI,
      functionName: \'registerAgent\',
      args: [agentAddress, agentType, metadataURI],
    });
  };

  return {
    isActive,
    isLoadingActive,
    registerAgent,
    isRegistering,
    isConfirming,
    isRegistered,
    txHash: hash,
  };
}
