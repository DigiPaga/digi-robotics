import "server-only";

import { getAddress, isAddress } from "viem";
import { memo } from "./cache";
import { OPS_CHAINS } from "./chains";
import { OPS_DEPLOYMENTS } from "./deployments";
import { fetchCiStatus, type CiStatus, type GithubOptions } from "./github";
import { hexToNumber, rpcBatch, rpcUrl, type RpcOptions } from "./rpc";
import { parseOpsWallets } from "./wallets";
import { fetchX402Health, type X402Health } from "./x402-server";

type Env = Record<string, string | undefined>;

export interface RpcStatus {
  chainId: number;
  name: string;
  /** Hostname of the RPC endpoint. */
  host: string;
  ok: boolean;
  latencyMs: number | null;
  blockNumber: number | null;
  blockTime: string | null;
  /** Seconds between the latest block and this read. A large value means the chain or the node is stalled. */
  blockAgeSeconds: number | null;
  /** False when the endpoint answers for a different chain id. */
  chainIdMatches: boolean | null;
}

export interface BuildInfo {
  commit: string | null;
  /** Name of the variable the commit came from. */
  commitSource: string | null;
  builtAt: string | null;
  runtime: string;
  nodeEnv: string;
}

export interface ConfigItem {
  name: string;
  set: boolean;
  purpose: string;
}

export interface ConfigCheck {
  label: string;
  /** null: not applicable (the variable is not set). */
  ok: boolean | null;
  detail: string;
}

export interface InfraSnapshot {
  refreshedAt: string;
  rpc: RpcStatus[];
  x402: X402Health;
  build: BuildInfo;
  ci: CiStatus;
  config: { items: ConfigItem[]; checks: ConfigCheck[] };
}

const RPC_STATUS_TTL_MS = 5_000;

/** One batch per chain: chain id and the latest block header. */
export async function readRpcStatus(options: RpcOptions = {}): Promise<RpcStatus[]> {
  const now = options.now ?? Date.now;
  return Promise.all(OPS_CHAINS.map(async (chain): Promise<RpcStatus> => {
    const url = rpcUrl(chain);
    const base = { chainId: chain.id, name: chain.name, host: new URL(url).hostname };
    const batch = await rpcBatch(url, [
      { method: "eth_chainId", params: [] },
      { method: "eth_getBlockByNumber", params: ["latest", false] },
    ], options);
    const [idResult, blockResult] = batch.results;
    const reportedId = idResult.ok ? hexToNumber(idResult.result) : null;
    const block = blockResult.ok ? (blockResult.result as { number?: unknown; timestamp?: unknown } | null) : null;
    const blockNumber = hexToNumber(block?.number);
    const seconds = hexToNumber(block?.timestamp);
    return {
      ...base,
      ok: batch.reachable && blockNumber !== null,
      latencyMs: batch.reachable ? batch.latencyMs : null,
      blockNumber,
      blockTime: seconds === null ? null : new Date(seconds * 1000).toISOString(),
      blockAgeSeconds: seconds === null ? null : Math.max(0, Math.round(now() / 1000 - seconds)),
      chainIdMatches: reportedId === null ? null : reportedId === chain.id,
    };
  }));
}

/** First of these that holds a commit hash wins. The Cloudflare and CI names are set by those platforms at build time. */
export const COMMIT_ENV_NAMES = ["NEXT_PUBLIC_COMMIT_SHA", "WORKERS_CI_COMMIT_SHA", "CF_PAGES_COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA", "GITHUB_SHA"] as const;

function runtimeName(): string {
  if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") return "Cloudflare Workers";
  const node = typeof process !== "undefined" ? process.versions?.node : undefined;
  return node ? `Node.js ${node.split(".")[0]}` : "unknown";
}

/**
 * NEXT_PUBLIC_* is inlined into the bundle at build time only where it is
 * written out literally, so the two build variables are read that way here
 * and still work on a runtime that does not carry them in its environment.
 */
function withBuildVariables(env: Env): Env {
  if (env !== process.env) return env;
  return { ...env, NEXT_PUBLIC_COMMIT_SHA: process.env.NEXT_PUBLIC_COMMIT_SHA, NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME };
}

export function readBuildInfo(env: Env = process.env): BuildInfo {
  const source = withBuildVariables(env);
  let commit: string | null = null;
  let commitSource: string | null = null;
  for (const name of COMMIT_ENV_NAMES) {
    const value = source[name]?.trim();
    if (value && /^[0-9a-f]{7,40}$/i.test(value)) {
      commit = value.toLowerCase();
      commitSource = name;
      break;
    }
  }
  const rawTime = source.NEXT_PUBLIC_BUILD_TIME?.trim();
  const time = rawTime ? new Date(/^\d+$/.test(rawTime) ? Number(rawTime) * 1000 : rawTime) : null;
  return {
    commit,
    commitSource,
    builtAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
    runtime: runtimeName(),
    nodeEnv: source.NODE_ENV === "production" ? "production" : source.NODE_ENV === "test" ? "test" : "development",
  };
}

/** Optional configuration the console reports on. Names and whether they are set, never values. */
const OPTIONAL_ENV: readonly { name: string; purpose: string }[] = [
  { name: "OPS_BASE_URL", purpose: "Public origin for sign-in redirects. Required in production." },
  { name: "OPS_WALLETS", purpose: "Wallets to monitor. Unset means deployer and settler." },
  { name: "X402_PAY_TO", purpose: "Treasury row in Wallets." },
  { name: "X402_SERVER_URL", purpose: "x402 server for Marketplace and health checks." },
  { name: "NEXT_PUBLIC_X402_BACKEND_URL", purpose: "Agent demo backend. Fallback for X402_SERVER_URL." },
  { name: "NEXT_PUBLIC_X402_BACKEND_URL_ROBINHOOD", purpose: "Agent demo backend on Robinhood Chain Testnet." },
  { name: "OPS_GITHUB_REPO", purpose: "Repository for CI status. Unset means DigiPaga/digi-robotics." },
  { name: "NEXT_PUBLIC_COMMIT_SHA", purpose: "Commit shown as the deployed build." },
  { name: "NEXT_PUBLIC_BUILD_TIME", purpose: "Build time shown next to the commit." },
  { name: "NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA", purpose: "mUSDG balances on Arbitrum Sepolia." },
  { name: "NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD", purpose: "mUSDG balances on Robinhood Chain Testnet." },
  { name: "NEXT_PUBLIC_STORE_WALLET_ADDRESS", purpose: "Gear checkout payee." },
  { name: "NEXT_PUBLIC_THIRDWEB_CLIENT_ID", purpose: "Wallet sign-in on the public site." },
  { name: "NEXT_PUBLIC_ZERODEV_PROJECT_ID", purpose: "Smart account sessions on the public site." },
  { name: "KIT_API_KEY", purpose: "Newsletter sign-up on the public site." },
];

function tokenCheck(env: Env, name: string, chainId: 421614 | 46630, chainName: string): ConfigCheck {
  const label = `mUSDG address on ${chainName} matches the deployment record`;
  const raw = env[name]?.trim();
  if (!raw) return { label, ok: null, detail: `${name} is not set.` };
  if (!isAddress(raw, { strict: false })) return { label, ok: false, detail: `${name} is not an address.` };
  const matches = getAddress(raw) === OPS_DEPLOYMENTS[chainId].MockUSDG.address;
  return { label, ok: matches, detail: matches ? "Same token as contracts/deployments." : `${name} points at a different token than contracts/deployments.` };
}

/** Pure. Reports names and booleans only; a value never appears in the result. */
export function readConfigSanity(env: Env = process.env): InfraSnapshot["config"] {
  const source = withBuildVariables(env);
  const items = OPTIONAL_ENV.map(({ name, purpose }) => ({ name, purpose, set: Boolean(source[name]?.trim()) }));
  const checks: ConfigCheck[] = [
    tokenCheck(source, "NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA", 421614, "Arbitrum Sepolia"),
    tokenCheck(source, "NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD", 46630, "Robinhood Chain Testnet"),
  ];
  const wallets = source.OPS_WALLETS?.trim();
  checks.push({
    label: "OPS_WALLETS parses",
    ok: wallets ? parseOpsWallets(wallets).warning === null : null,
    detail: !wallets ? "OPS_WALLETS is not set. Defaults are used." : parseOpsWallets(wallets).warning === null ? "Valid wallet list." : "Invalid. Defaults are used.",
  });
  const payTo = source.X402_PAY_TO?.trim();
  checks.push({
    label: "X402_PAY_TO is an address",
    ok: payTo ? isAddress(payTo, { strict: false }) : null,
    detail: !payTo ? "X402_PAY_TO is not set." : isAddress(payTo, { strict: false }) ? "Valid address." : "Not an address. The treasury row is hidden.",
  });
  return { items, checks };
}

export interface InfraOptions extends RpcOptions, GithubOptions {
  fresh?: boolean;
}

/** Request budget: one batch per chain, one x402 /health, at most one GitHub call. */
export async function fetchInfra(options: InfraOptions = {}): Promise<InfraSnapshot> {
  const env = options.env ?? process.env;
  const [rpc, x402, ci] = await Promise.all([
    memo("rpc-status", RPC_STATUS_TTL_MS, () => readRpcStatus(options), { fresh: options.fresh, now: options.now }),
    fetchX402Health({ fetchImpl: options.fetchImpl, env, now: options.now, fresh: options.fresh }),
    fetchCiStatus({ fetchImpl: options.fetchImpl, env, now: options.now }),
  ]);
  return { refreshedAt: new Date().toISOString(), rpc, x402, build: readBuildInfo(env), ci, config: readConfigSanity(env) };
}
