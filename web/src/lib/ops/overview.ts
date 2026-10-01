import "server-only";

import { fetchOpsBalancesCached, type OpsBalancesSnapshot } from "./balances";
import { fetchContracts, summarizeContracts, type ContractsSnapshot } from "./contracts";
import { fetchCiStatus, type CiStatus } from "./github";
import { readBuildInfo, type BuildInfo } from "./infra";
import { fetchPayments, type PaymentsSnapshot } from "./payments";
import { fetchX402Health, type X402Health } from "./x402-server";

export type CheckStatus = "ok" | "warn" | "bad" | "unknown";

export interface OverviewCheck {
  id: string;
  label: string;
  status: CheckStatus;
  summary: string;
  detail: string | null;
  /** A moment the client renders as relative time (last settlement, last CI run, build). */
  at: string | null;
  /** The section that explains this check. */
  href: string;
  external: { label: string; url: string } | null;
}

export interface OverviewSnapshot {
  refreshedAt: string;
  checks: OverviewCheck[];
  counts: Record<CheckStatus, number>;
}

export interface OverviewParts {
  balances: OpsBalancesSnapshot | null;
  payments: PaymentsSnapshot | null;
  contracts: ContractsSnapshot | null;
  x402: X402Health | null;
  ci: CiStatus | null;
  build: BuildInfo;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function trimAmount(value: string, digits: number): string {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(digits))) : value;
}

function walletsCheck(balances: OpsBalancesSnapshot | null): OverviewCheck {
  const base = { id: "wallets", label: "Wallets", href: "/ops/wallets", at: null, external: null };
  if (!balances) return { ...base, status: "unknown", summary: "Balances could not be read", detail: null };
  const low: string[] = [];
  let unreadable = 0;
  for (const row of balances.rows) {
    for (const cell of row.cells) {
      const chain = balances.chains.find((item) => item.id === cell.chainId);
      if (cell.eth === null) unreadable += 1;
      else if (cell.low) low.push(`${row.wallet.label} on ${chain?.name ?? cell.chainId}: ${trimAmount(cell.eth, 5)} ETH, minimum ${row.wallet.minEth}`);
    }
  }
  if (low.length > 0) return { ...base, status: "bad", summary: `${plural(low.length, "balance")} below minimum`, detail: low.slice(0, 3).join(". ") };
  if (unreadable > 0) return { ...base, status: "warn", summary: `${plural(unreadable, "balance")} unreadable`, detail: "An RPC did not answer. Open Wallets and refresh." };
  return { ...base, status: "ok", summary: `${plural(balances.rows.length, "wallet")} above minimum`, detail: `Checked on ${plural(balances.chains.length, "chain")}.` };
}

function x402Check(x402: X402Health | null): OverviewCheck {
  const base = { id: "x402", label: "x402 server", href: "/ops/infra", at: null, external: null };
  if (!x402) return { ...base, status: "unknown", summary: "Health could not be read", detail: null };
  if (x402.state === "unconfigured") return { ...base, status: "unknown", summary: "Not configured", detail: "Set X402_SERVER_URL to watch the x402 server." };
  if (x402.state === "unreachable") return { ...base, status: "bad", summary: "Unreachable", detail: `${x402.origin} did not answer /health.` };
  if (x402.state === "invalid") return { ...base, status: "bad", summary: `Unhealthy${x402.httpStatus ? ` (HTTP ${x402.httpStatus})` : ""}`, detail: `${x402.origin} answered /health with an unexpected body.` };
  const latency = x402.latencyMs === null ? "" : ` in ${x402.latencyMs} ms`;
  if (x402.mode === "BLOCKED") return { ...base, status: "warn", summary: "Up, mode BLOCKED", detail: `Answered${latency}. BLOCKED means no signer is configured, so it cannot settle payments.` };
  return { ...base, status: "ok", summary: x402.mode ? `Up, mode ${x402.mode}` : "Up", detail: `${x402.origin} answered${latency}.` };
}

function contractsCheck(contracts: ContractsSnapshot | null): OverviewCheck {
  const base = { id: "contracts", label: "Contracts", href: "/ops/contracts", at: null, external: null };
  if (!contracts) return { ...base, status: "unknown", summary: "Contract state could not be read", detail: null };
  const health = summarizeContracts(contracts);
  const problems: string[] = [];
  if (health.missingCode > 0) problems.push(`${plural(health.missingCode, "address", "addresses")} without code`);
  if (health.settlerNotApproved > 0) problems.push(`settler not approved on ${plural(health.settlerNotApproved, "chain")}`);
  if (health.tokenMismatch > 0) problems.push(`facilitator token differs on ${plural(health.tokenMismatch, "chain")}`);
  if (problems.length > 0) return { ...base, status: "bad", summary: problems[0][0].toUpperCase() + problems[0].slice(1), detail: problems.length > 1 ? problems.slice(1).join(", ") : null };
  if (health.paused > 0) return { ...base, status: "warn", summary: `${plural(health.paused, "contract")} paused`, detail: null };
  if (health.unknown > 0) return { ...base, status: "warn", summary: "Some values unreadable", detail: "An RPC did not answer. Open Contracts and refresh." };
  return { ...base, status: "ok", summary: `${plural(health.total, "contract")} deployed, none paused`, detail: `Settler approved on ${plural(contracts.chains.length, "chain")}.` };
}

function settlementChecks(payments: PaymentsSnapshot | null): OverviewCheck[] {
  if (!payments) return [{ id: "settlement", label: "Last settlement", status: "unknown", summary: "Payments could not be read", detail: null, at: null, href: "/ops/payments", external: null }];
  return payments.chains.map((chain): OverviewCheck => {
    const base = { id: `settlement-${chain.chainId}`, label: `Last settlement, ${chain.name.replace(" Chain Testnet", "")}`, href: "/ops/payments" };
    if (!chain.ok) return { ...base, status: "unknown", summary: chain.error ?? "Logs could not be read", detail: null, at: null, external: null };
    const last = chain.lastSettlement;
    if (!last) return { ...base, status: "warn", summary: "No settlement yet", detail: chain.range?.truncated ? "Only a recent block window could be read." : "No EIP-3009 payment since the contracts were deployed.", at: null, external: null };
    return {
      ...base,
      status: "ok",
      summary: `${trimAmount(last.amount, 6)} ${payments.token.symbol}`,
      detail: `${plural(chain.totals.payments, "payment")}, ${trimAmount(chain.totals.volume, 6)} ${payments.token.symbol} in total.`,
      at: last.timestamp,
      external: { label: "Transaction", url: `${chain.explorer}/tx/${last.txHash}` },
    };
  });
}

function ciCheck(ci: CiStatus | null): OverviewCheck {
  const base = { id: "ci", label: "CI on main", href: "/ops/infra" };
  if (!ci) return { ...base, status: "unknown", summary: "CI status could not be read", detail: null, at: null, external: null };
  if (ci.state === "rate_limited") return { ...base, status: "unknown", summary: "GitHub rate limit reached", detail: "The public API allows 60 requests per hour per address.", at: ci.rateLimitResetAt, external: null };
  const run = ci.latest;
  if (ci.state === "unavailable" || !run) return { ...base, status: "unknown", summary: ci.state === "unavailable" ? "GitHub did not answer" : "No runs on main", detail: null, at: null, external: null };
  const stale = ci.state === "stale" ? " Shown from the last successful check." : "";
  const detail = `${run.workflow} on ${run.sha.slice(0, 7)}.${stale}`;
  const external = { label: "Run", url: run.url };
  if (run.status !== "completed") return { ...base, status: "warn", summary: run.status === "queued" ? "Queued" : "Running", detail, at: run.updatedAt, external };
  if (run.conclusion === "success") return { ...base, status: "ok", summary: "Passed", detail, at: run.updatedAt, external };
  if (run.conclusion === "cancelled" || run.conclusion === "skipped") return { ...base, status: "warn", summary: run.conclusion === "cancelled" ? "Cancelled" : "Skipped", detail, at: run.updatedAt, external };
  return { ...base, status: "bad", summary: "Failed", detail, at: run.updatedAt, external };
}

function buildCheck(build: BuildInfo, ci: CiStatus | null): OverviewCheck {
  const base = { id: "build", label: "Deployed commit", href: "/ops/infra", external: null };
  if (!build.commit) return { ...base, status: "unknown", summary: "Not recorded", detail: "Set NEXT_PUBLIC_COMMIT_SHA at build time.", at: build.builtAt };
  const short = build.commit.slice(0, 7);
  const head = ci?.latest?.sha ?? null;
  if (head && !head.startsWith(build.commit) && !build.commit.startsWith(head)) {
    return { ...base, status: "warn", summary: `${short}, not the head of main`, detail: `main is at ${head.slice(0, 7)}.`, at: build.builtAt };
  }
  return { ...base, status: "ok", summary: short, detail: head ? "Same commit as main." : `${build.runtime}, ${build.nodeEnv}.`, at: build.builtAt };
}

/** Pure: every tile of the overview from whatever parts could be read. */
export function buildOverview(parts: OverviewParts, refreshedAt = new Date().toISOString()): OverviewSnapshot {
  const checks = [
    walletsCheck(parts.balances),
    x402Check(parts.x402),
    contractsCheck(parts.contracts),
    ...settlementChecks(parts.payments),
    ciCheck(parts.ci),
    buildCheck(parts.build, parts.ci),
  ];
  const counts: Record<CheckStatus, number> = { ok: 0, warn: 0, bad: 0, unknown: 0 };
  for (const check of checks) counts[check.status] += 1;
  return { refreshedAt, checks, counts };
}

export interface OverviewLoaders {
  balances: () => Promise<OpsBalancesSnapshot>;
  payments: () => Promise<PaymentsSnapshot>;
  contracts: () => Promise<ContractsSnapshot>;
  x402: () => Promise<X402Health>;
  ci: () => Promise<CiStatus>;
  build: () => BuildInfo;
}

/**
 * Request budget: 2 (balances) + 2 (payments) + 2 (contracts) + 1 (x402) + 1
 * (GitHub) = 8 in the normal case, each behind the per-isolate cache the
 * sections share. A part that throws becomes "unknown"; it never fails the rest.
 */
export async function fetchOverview(options: { fresh?: boolean } = {}, loaders: Partial<OverviewLoaders> = {}): Promise<OverviewSnapshot> {
  const settle = async <T>(load: () => Promise<T>): Promise<T | null> => {
    try {
      return await load();
    } catch {
      return null;
    }
  };
  const [balances, payments, contracts, x402, ci] = await Promise.all([
    settle(loaders.balances ?? (() => fetchOpsBalancesCached(options))),
    settle(loaders.payments ?? (() => fetchPayments(options))),
    settle(loaders.contracts ?? (() => fetchContracts(options))),
    settle(loaders.x402 ?? (() => fetchX402Health(options))),
    settle(loaders.ci ?? (() => fetchCiStatus())),
  ]);
  return buildOverview({ balances, payments, contracts, x402, ci, build: (loaders.build ?? readBuildInfo)() });
}
