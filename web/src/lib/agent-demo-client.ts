export type DemoMode = "REAL_MUSDG_X402" | "REAL_X402_TEST_ASSET" | "BLOCKED";
export type RunState = "queued" | "preflight" | "searching" | "candidates_found" | "selected" | "requesting_resource" | "payment_required" | "validating_policy" | "signing_payment" | "retrying_request" | "verifying" | "settling" | "unlocked" | "failed";

export interface DemoCandidate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  mimeType: string;
  priceDisplay: string;
  network: string;
  assetSymbol: string;
  assetAddress: string;
  sellerAddress: string;
  resourceUrl: string;
  source: "bazaar" | "digirobotics";
  score: number;
  policyEligible: boolean;
  reasons: string[];
}

export interface DemoEvent {
  sequence: number;
  state: RunState;
  timestamp: string;
  message: string;
  mode: DemoMode;
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
  source?: "bazaar" | "digirobotics";
  candidates?: DemoCandidate[];
  requirements?: { scheme: string; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number; assetTransferMethod?: string; paymentFlow?: string };
  errorCode?: string;
}

export interface DemoRun {
  id: string;
  state: RunState;
  mode: DemoMode;
  events: DemoEvent[];
  selected?: DemoCandidate;
  requirements?: DemoEvent["requirements"];
  result?: {
    datasetId: string;
    title: string;
    signedUrl?: string;
    expiresAt?: string;
    payment: { network: string; assetSymbol: string; amount: string; transactionHash: string };
  };
  error?: { code: string; message: string };
}

export interface CompatibilityReport {
  selectedMode: DemoMode;
  selectedAsset: { network: string; chainId: number; address: string; symbol: string; decimals: number; transferMethod: string };
  facilitator: { url: string };
  buyer: { address?: string; model: string; zeroDevUsed: boolean };
  seller: { address: string; distinctFromBuyer: boolean };
  price: string;
}

const BACKEND = (process.env.NEXT_PUBLIC_X402_BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "");

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.message === "string" ? body.message : `Backend returned ${response.status}`);
  return body as T;
}

export async function getCompatibility(): Promise<CompatibilityReport> {
  return readJson(await fetch(`${BACKEND}/agent-demo/compatibility`, { cache: "no-store" }));
}

export async function createAgentRun(idempotencyKey: string): Promise<{ runId: string; created: boolean }> {
  return readJson(await fetch(`${BACKEND}/agent-demo/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: "{}",
  }));
}

export async function getAgentRun(runId: string): Promise<DemoRun> {
  return readJson(await fetch(`${BACKEND}/agent-demo/runs/${encodeURIComponent(runId)}`, { cache: "no-store" }));
}

export function subscribeToAgentRun(runId: string, handlers: { onEvent: (event: DemoEvent) => void; onError: () => void }): () => void {
  const source = new EventSource(`${BACKEND}/agent-demo/runs/${encodeURIComponent(runId)}/events`);
  source.addEventListener("run", raw => handlers.onEvent(JSON.parse((raw as MessageEvent).data) as DemoEvent));
  source.onerror = handlers.onError;
  return () => source.close();
}
