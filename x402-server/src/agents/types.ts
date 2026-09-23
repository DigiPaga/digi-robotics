// x402 Agent Protocol Types
export interface X402Agent {
  identity: {
    address: string;
    agentType: 'scout' | 'outreach' | 'verifier' | 'trader';
    capabilities: string[];
    metadataURI: string;
  };
  wallet: {
    balance: bigint;
    nonce: number;
  };
  config: {
    targetNetworks: number[];
    maxPaymentPerInteraction: bigint;
    autoNegotiate: boolean;
  };
}

export interface AgentToAgentMessage {
  from: string;
  to: string;
  type: 'invitation' | 'catalog_request' | 'bounty_proposal' | 'payment_proof';
  payload: any;
  signature: string;
  timestamp: number;
}
