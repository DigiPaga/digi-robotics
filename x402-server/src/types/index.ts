export interface Asset {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  type: 'pdf' | 'video' | 'dataset' | 'cad' | 'json' | 'csv';
  category: string;
  ipfsHash: string;
  seller: string;
  metadata: AssetMetadata;
}

export interface AssetMetadata {
  size?: string;
  duration?: string;
  resolution?: string;
  format?: string;
  tags: string[];
  qualityScore: number;
  captureDevice: string;
  egocentric: boolean;
}

export interface PaymentRequest {
  assetId: string;
  buyer: string;
  agent: string;
  amount: bigint;
  nonce: number;
  deadline: number;
  signature: string;
}

export interface PaymentDetails {
  price: string;
  currency: string;
  network: string;
  recipient: string;
  requiredHeaders: string[];
  paymentContract: string;
}

export interface AgentIdentity {
  address: string;
  owner: string;
  agentType: 'vps' | 'robot' | 'mobile' | 'desktop';
  metadataURI: string;
  isActive: boolean;
  registeredAt: number;
  reputationScore?: number;
}

export interface CatalogFilters {
  type?: string;
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  egocentric?: boolean;
  minQualityScore?: number;
}
