import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import config from '../config';
import { AgentIdentity } from '../types';
import logger from '../utils/logger';

const AGENT_REGISTRY_ABI = parseAbi([
  'function registerAgent(address agentAddress, string calldata agentType, string calldata metadataURI) external returns (uint256)',
  'function isAgentActive(address agentAddress) external view returns (bool)',
  'function getAgentIdentity(address agentAddress) external view returns (tuple(address agentAddress, address owner, string agentType, string metadataURI, bool isActive, uint256 registeredAt))',
  'function verifyAgent(address agentAddress, bytes32 verificationHash) external',
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

export const agentRegistry = {
  async isActive(agentAddress: string): Promise<boolean> {
    try {
      const result = await publicClient.readContract({
        address: config.contracts.agentRegistry as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'isAgentActive',
        args: [agentAddress as `0x${string}`],
      });
      return result as boolean;
    } catch (error) {
      logger.error('Failed to check agent status', error);
      return false;
    }
  },

  async getIdentity(agentAddress: string): Promise<AgentIdentity | null> {
    try {
      const result = await publicClient.readContract({
        address: config.contracts.agentRegistry as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'getAgentIdentity',
        args: [agentAddress as `0x${string}`],
      });
      
      const identity = result as any;
      return {
        address: identity.agentAddress,
        owner: identity.owner,
        agentType: identity.agentType,
        metadataURI: identity.metadataURI,
        isActive: identity.isActive,
        registeredAt: Number(identity.registeredAt),
      };
    } catch (error) {
      logger.error('Failed to get agent identity', error);
      return null;
    }
  },

  async register(agentAddress: string, agentType: string, metadataURI: string): Promise<string | null> {
      logger.error('Wallet client not configured');
      return null;
    }

    try {
      const hash = await walletClient.writeContract({
        address: config.contracts.agentRegistry as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [agentAddress as `0x${string}`, agentType, metadataURI],
      });

      logger.success('Agent registered', { hash });
      return hash;
    } catch (error) {
      logger.error('Failed to register agent', error);
      return null;
    }
  },
};

export default agentRegistry;
