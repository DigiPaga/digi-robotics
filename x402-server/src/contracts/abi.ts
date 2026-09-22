export const AGENT_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'agentAddress', type: 'address' },
      { internalType: 'string', name: 'agentType', type: 'string' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
    name: 'registerAgent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'agentAddress', type: 'address' }],
    name: 'isAgentActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'agentAddress', type: 'address' }],
    name: 'getAgentIdentity',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'agentAddress', type: 'address' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'string', name: 'agentType', type: 'string' },
          { internalType: 'string', name: 'metadataURI', type: 'string' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
          { internalType: 'uint256', name: 'registeredAt', type: 'uint256' },
        ],
        internalType: 'struct AgentRegistry.AgentIdentity',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const MARKETPLACE_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'ipfsURI', type: 'string' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'listAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'address', name: 'agentAddress', type: 'address' },
    ],
    name: 'purchaseWithAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAsset',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'seller', type: 'address' },
          { internalType: 'string', name: 'ipfsURI', type: 'string' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'bool', name: 'isSold', type: 'bool' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct RoboticsMarketplace.Asset',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
