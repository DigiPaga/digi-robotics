export type DemoMode = "REAL_MUSDG_X402" | "REAL_X402_TEST_ASSET" | "BLOCKED";
export type RunState = "queued" | "preflight" | "searching" | "candidates_found" | "selected" | "requesting_resource" | "payment_required" | "validating_policy" | "signing_payment" | "retrying_request" | "verifying" | "settling" | "unlocked" | "failed";
export type AgentLifecycleState = "idle" | "discovering" | "dataset_selected" | "payment_required" | "authorizing" | "settling" | "confirming" | "unlocked" | "failed";

export function toAgentLifecycleState(state?: RunState): AgentLifecycleState {
  if (!state) return "idle";
  if (["queued", "preflight", "searching", "candidates_found"].includes(state)) return "discovering";
  if (["selected", "requesting_resource"].includes(state)) return "dataset_selected";
  if (state === "payment_required") return "payment_required";
  if (["validating_policy", "signing_payment", "retrying_request"].includes(state)) return "authorizing";
  if (state === "verifying") return "settling";
  if (state === "settling") return "confirming";
  if (state === "unlocked" || state === "failed") return state;
  return "idle";
}

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
  if (!response.ok) {
    const error = new Error(typeof body?.message === "string" ? body.message : "The agent service could not complete the request.") as Error & { code?: string; status?: number };
    error.code = typeof body?.code === "string" ? body.code : response.status >= 500 ? "RPC_UNAVAILABLE" : `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
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
  source.addEventListener("run", raw => {
    try {
      handlers.onEvent(JSON.parse((raw as MessageEvent).data) as DemoEvent);
    } catch {
      handlers.onError();
    }
  });
  source.onerror = handlers.onError;
  return () => source.close();
}
