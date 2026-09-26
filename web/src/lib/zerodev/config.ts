import type { IntegrationReadiness, SupportedChainId } from "./types";

const SUPPORTED_CHAINS = new Set<number>([421614, 42161, 46630]);

export function getZeroDevReadiness(): IntegrationReadiness {
  const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID?.trim();
  const rpcUrl = process.env.NEXT_PUBLIC_ZERODEV_RPC_URL?.trim();
  const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  if (!projectId || !rpcUrl || !rawChainId) return { ready: false, reason: "missing-config" };
  const chainId = Number(rawChainId);
  if (!SUPPORTED_CHAINS.has(chainId)) return { ready: false, reason: "unsupported-chain" };
  return { ready: true, projectId, rpcUrl, chainId: chainId as SupportedChainId };
}
