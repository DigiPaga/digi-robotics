import type { PaymentRequirements } from "@x402/core/types";

export type AgentDemoMode = "REAL_MUSDG_X402" | "REAL_X402_TEST_ASSET" | "BLOCKED";
export type RunState =
  | "queued"
  | "preflight"
  | "searching"
  | "candidates_found"
  | "selected"
  | "requesting_resource"
  | "payment_required"
  | "validating_policy"
  | "signing_payment"
  | "retrying_request"
  | "verifying"
  | "settling"
  | "unlocked"
  | "failed";

export type ErrorCode =
  | "INSUFFICIENT_BALANCE"
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_ASSET"
  | "POLICY_REJECTED"
  | "INVALID_PAYMENT_REQUIREMENTS"
  | "FACILITATOR_FAILURE"
  | "SETTLEMENT_FAILURE"
  | "CONTENT_FAILURE"
  | "TIMEOUT"
  | "CONFIGURATION_ERROR"
  | "CONCURRENCY_LIMIT";

export interface PublicDataset {
  id: string;
  title: string;
  description: string;
  tags: string[];
  mimeType: string;
  priceDisplay: string;
  network: string;
  assetSymbol: string;
  assetAddress: `0x${string}`;
  sellerAddress: `0x${string}`;
  resourceUrl: string;
  previewUrl?: string;
}

export interface UnlockedDataset {
  datasetId: string;
  title: string;
  signedUrl?: string;
  expiresAt?: string;
  payment: {
    network: string;
    assetSymbol: string;
    amount: string;
    transactionHash: string;
  };
}

export interface DiscoveryCandidate extends PublicDataset {
  source: "bazaar" | "digirobotics";
  score: number;
  policyEligible: boolean;
  reasons: string[];
  paymentRequirements?: PaymentRequirements;
}

export interface SafePaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  assetTransferMethod?: string;
  paymentFlow?: string;
}

export interface AgentRunEvent {
  sequence: number;
  state: RunState;
  timestamp: string;
  message: string;
  mode: AgentDemoMode;
  datasetId?: string;
  datasetTitle?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payTo?: string;
  agentAddress?: string;
  balance?: string;
  transactionHash?: string;
  explorerUrl?: string;
  source?: DiscoveryCandidate["source"];
  candidates?: DiscoveryCandidate[];
  requirements?: SafePaymentRequirements;
  errorCode?: ErrorCode;
}

export interface AgentRun {
  id: string;
  idempotencyKey: string;
  state: RunState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  mode: AgentDemoMode;
  events: AgentRunEvent[];
  selected?: DiscoveryCandidate;
  requirements?: SafePaymentRequirements;
  result?: UnlockedDataset;
  error?: { code: ErrorCode; message: string };
  paymentStarted: boolean;
}
