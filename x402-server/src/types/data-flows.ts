// Tipos para el flujo de Retail (Subida de datos)
export interface DataSubmission {
  id: string;
  uploaderAddress: string;
  title: string;
  description: string;
  category: 'industrial' | 'household' | 'medical' | 'logistics';
  tags: string[];
  durationSeconds: number;
  qualityScore: number; // 0-100, evaluado por IA
  status: 'pending' | 'verified' | 'rejected' | 'sold';
  ipfsCid: string;
  encryptionKeyHash: string;
  createdAt: number;
}

// Tipos para el flujo Pro (Solicitud de datos / Bounties)
export interface DataRequest {
  id: string;
  requesterAddress: string;
  title: string;
  description: string;
  requiredTags: string[];
  minQualityScore: number;
  bountyAmount: string; // En USDC
  status: 'open' | 'fulfilled' | 'expired';
  createdAt: number;
}
