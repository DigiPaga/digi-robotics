import { arbitrumSepolia, robinhoodTestnet } from "@/lib/chains";
import { getTransactionExplorerUrl } from "@/lib/network-utils";

/**
 * The agent demo runs against one x402 backend per chain: the Arbitrum Sepolia Worker and the
 * Robinhood Chain Testnet Worker are separate deployments with their own runs and budgets.
 */
export type AgentDemoChainId = "arbitrum-sepolia" | "robinhood-testnet";

export interface AgentDemoChain {
  id: AgentDemoChainId;
  name: string;
  chainId: number;
  /** Origin of the x402 backend without a trailing slash, or undefined when not configured. */
  backendUrl?: string;
}

export const DEFAULT_AGENT_DEMO_CHAIN: AgentDemoChainId = "arbitrum-sepolia";

/** Only the Arbitrum backend has a local fallback, so `npm run dev` keeps working with no env. */
const LOCAL_BACKEND_URL = "http://localhost:3001";

export interface AgentDemoBackendEnv {
  arbitrum?: string;
  robinhood?: string;
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  } catch {
    return undefined;
  }
  return trimmed.replace(/\/+$/, "");
}

export function getAgentDemoChains(env: AgentDemoBackendEnv): AgentDemoChain[] {
  return [
    { id: "arbitrum-sepolia", name: arbitrumSepolia.name, chainId: arbitrumSepolia.id, backendUrl: normalizeUrl(env.arbitrum) ?? LOCAL_BACKEND_URL },
    { id: "robinhood-testnet", name: robinhoodTestnet.name, chainId: robinhoodTestnet.id, backendUrl: normalizeUrl(env.robinhood) },
  ];
}

/** Built from the NEXT_PUBLIC_ values Next.js inlines at build time; they must be read literally. */
export const agentDemoChains = getAgentDemoChains({
  arbitrum: process.env.NEXT_PUBLIC_X402_BACKEND_URL,
  robinhood: process.env.NEXT_PUBLIC_X402_BACKEND_URL_ROBINHOOD,
});

export function isAgentDemoChainAvailable(chain: AgentDemoChain): chain is AgentDemoChain & { backendUrl: string } {
  return Boolean(chain.backendUrl);
}

/**
 * The chain to show for a requested id (from the URL, say): that chain when it is known and
 * configured, otherwise the default chain, otherwise the first configured one.
 */
export function resolveAgentDemoChain(chains: readonly AgentDemoChain[], requested?: string | null): AgentDemoChain & { backendUrl: string } {
  const available = chains.filter(isAgentDemoChainAvailable);
  const chain = available.find((item) => item.id === requested)
    ?? available.find((item) => item.id === DEFAULT_AGENT_DEMO_CHAIN)
    ?? available[0];
  if (!chain) throw new Error("No agent demo backend is configured");
  return chain;
}

/**
 * Explorer link for a settlement. The network the backend reported wins, since that is where the
 * transaction landed; the selected chain is the fallback when a payload omits it.
 */
export function getAgentDemoTransactionUrl(chain: AgentDemoChain, transactionHash: string | undefined, network?: string): string | undefined {
  return getTransactionExplorerUrl(network ?? chain.chainId, transactionHash);
}

/** sessionStorage key for the in-flight run of a chain; Arbitrum keeps the original key. */
export function agentDemoRunStorageKey(chain: AgentDemoChainId): string {
  const base = "digirobotics:agent-demo-run:v1";
  return chain === DEFAULT_AGENT_DEMO_CHAIN ? base : `${base}:${chain}`;
}
