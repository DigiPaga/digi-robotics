// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { OpsBalancesSnapshot } from "./balances";
import type { ContractsSnapshot, ContractStatus } from "./contracts";
import { OPS_DEPLOYMENTS, OPS_SETTLER } from "./deployments";
import type { CiRun, CiStatus } from "./github";
import type { BuildInfo } from "./infra";
import { buildOverview, fetchOverview, type OverviewParts } from "./overview";
import type { ChainPayments, PaymentRow, PaymentsSnapshot } from "./payments";
import type { X402Health } from "./x402-server";

const chains = [
  { id: 421614, name: "Arbitrum Sepolia", explorer: "https://sepolia.arbiscan.io", musdgToken: null },
  { id: 46630, name: "Robinhood Chain Testnet", explorer: "https://explorer.testnet.chain.robinhood.com", musdgToken: null },
];

function balances(settlerRobinhoodEth: string | null, low = false): OpsBalancesSnapshot {
  const cell = (chainId: number, eth: string | null, isLow = false) => ({ chainId, ethWei: eth, eth, low: isLow, musdg: null, error: eth === null ? "RPC unavailable" : null });
  return {
    refreshedAt: "2026-10-01T16:00:00.000Z",
    chains,
    warning: null,
    rows: [
      { wallet: { label: "Deployer", address: "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6", role: "", minEth: 0.01 }, cells: [cell(421614, "0.2"), cell(46630, "0.3")] },
      { wallet: { label: "Settler", address: OPS_SETTLER, role: "", minEth: 0.005 }, cells: [cell(421614, "0.05"), cell(46630, settlerRobinhoodEth, low)] },
    ],
  };
}

const row: PaymentRow = {
  chainId: 421614, kind: "settled", txHash: "0xd2d5a3851db8723f65c1c441d3fa83f468443f6860b1a1ab82efe002dd521d89", logIndex: 7, blockNumber: 314674503,
  timestamp: "2026-10-01T12:00:00.000Z", from: "0xF16f0871811A545214f9f39EC6a8Ac84FdbA9fe3", to: "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6",
  amountAtomic: "50000", amount: "0.05", resourceId: null, nonce: null, settler: OPS_SETTLER,
};

function chainPayments(chainId: number, last: PaymentRow | null, ok = true): ChainPayments {
  const info = chains.find((chain) => chain.id === chainId)!;
  return {
    chainId, name: info.name, explorer: info.explorer, ok, error: ok ? null : "RPC unavailable", range: ok ? { fromBlock: 1, toBlock: 2, truncated: false } : null,
    totals: { payments: last ? 1 : 0, settled: last ? 1 : 0, volumeAtomic: last ? "50000" : "0", volume: last ? "0.05" : "0", uniquePayers: last ? 1 : 0, otherTransfers: 0 },
    lastSettlement: last, rows: last ? [last] : [], rowCount: last ? 1 : 0,
  };
}

function payments(...list: ChainPayments[]): PaymentsSnapshot {
  return { refreshedAt: "", token: { symbol: "mUSDG", decimals: 6 }, chains: list, totals: list[0].totals };
}

function contract(key: ContractStatus["key"], overrides: Partial<ContractStatus> = {}): ContractStatus {
  const { address, deployBlock } = OPS_DEPLOYMENTS[421614][key];
  return {
    key, address, deployBlock, codePresent: true, owner: { status: "absent" }, paused: { status: "absent" }, token: null,
    facilitator: key === "X402Facilitator"
      ? { token: { status: "ok", value: OPS_DEPLOYMENTS[421614].MockUSDG.address }, tokenMatches: true, settler: OPS_SETTLER, settlerApproved: { status: "ok", value: true }, pendingOwner: { status: "absent" } }
      : null,
    ...overrides,
  };
}

function contracts(list: ContractStatus[] = [contract("MockUSDG"), contract("X402Facilitator"), contract("AgentRegistry"), contract("RoboticsMarketplace")]): ContractsSnapshot {
  return { refreshedAt: "", settler: OPS_SETTLER, chains: [{ chainId: 421614, name: "Arbitrum Sepolia", explorer: chains[0].explorer, reachable: true, contracts: list }] };
}

const run: CiRun = { id: 1, workflow: "CI", status: "completed", conclusion: "success", sha: "d362ad3561850360abba2459f4ee38d7b0ddf53d", title: "Merge", event: "push", createdAt: "2026-10-01T16:21:25Z", updatedAt: "2026-10-01T16:24:02Z", url: "https://github.com/DigiPaga/digi-robotics/actions/runs/1" };
const ci = (overrides: Partial<CiStatus> = {}): CiStatus => ({ state: "ok", repo: "DigiPaga/digi-robotics", branch: "main", runs: [run], latest: run, fetchedAt: "2026-10-01T16:25:00.000Z", rateLimitResetAt: null, ...overrides });
const x402 = (overrides: Partial<X402Health> = {}): X402Health => ({ state: "ok", origin: "https://x402.example.test", mode: "REAL_MUSDG_X402", latencyMs: 40, httpStatus: 200, ...overrides });
const build = (overrides: Partial<BuildInfo> = {}): BuildInfo => ({ commit: "d362ad3561850360abba2459f4ee38d7b0ddf53d", commitSource: "NEXT_PUBLIC_COMMIT_SHA", builtAt: "2026-10-01T16:30:00.000Z", runtime: "Node.js 22", nodeEnv: "production", ...overrides });

const healthy: OverviewParts = {
  balances: balances("0.05"),
  payments: payments(chainPayments(421614, row), chainPayments(46630, { ...row, chainId: 46630 })),
  contracts: contracts(),
  x402: x402(),
  ci: ci(),
  build: build(),
};

const byId = (parts: OverviewParts) => Object.fromEntries(buildOverview(parts, "now").checks.map((check) => [check.id, check]));

describe("buildOverview", () => {
  it("is all green for a healthy deployment and links every tile to its section", () => {
    const overview = buildOverview(healthy, "now");
    expect(overview.checks.map((check) => check.id)).toEqual(["wallets", "x402", "contracts", "settlement-421614", "settlement-46630", "ci", "build"]);
    expect(overview.counts).toEqual({ ok: 7, warn: 0, bad: 0, unknown: 0 });
    expect(overview.checks.map((check) => check.href)).toEqual(["/ops/wallets", "/ops/infra", "/ops/contracts", "/ops/payments", "/ops/payments", "/ops/infra", "/ops/infra"]);
    const settlement = overview.checks[3];
    expect(settlement).toMatchObject({ summary: "0.05 mUSDG", at: "2026-10-01T12:00:00.000Z", external: { url: `https://sepolia.arbiscan.io/tx/${row.txHash}` } });
    expect(overview.checks[6]).toMatchObject({ summary: "d362ad3", detail: "Same commit as main." });
  });

  it("names the wallet and chain that fell below its minimum", () => {
    const check = byId({ ...healthy, balances: balances("0.0031", true) }).wallets;
    expect(check).toMatchObject({ status: "bad", summary: "1 balance below minimum" });
    expect(check.detail).toBe("Settler on Robinhood Chain Testnet: 0.0031 ETH, minimum 0.005");
  });

  it("warns, not fails, when a balance could not be read", () => {
    expect(byId({ ...healthy, balances: balances(null) }).wallets).toMatchObject({ status: "warn", summary: "1 balance unreadable" });
  });

  it("grades the x402 server states", () => {
    expect(byId({ ...healthy, x402: x402({ mode: "BLOCKED" }) }).x402).toMatchObject({ status: "warn", summary: "Up, mode BLOCKED" });
    expect(byId({ ...healthy, x402: x402({ state: "unreachable", mode: null, latencyMs: null, httpStatus: null }) }).x402).toMatchObject({ status: "bad", summary: "Unreachable" });
    expect(byId({ ...healthy, x402: x402({ state: "invalid", httpStatus: 500 }) }).x402).toMatchObject({ status: "bad", summary: "Unhealthy (HTTP 500)" });
    expect(byId({ ...healthy, x402: x402({ state: "unconfigured", origin: null }) }).x402).toMatchObject({ status: "unknown", summary: "Not configured" });
  });

  it("flags missing code, a revoked settler and a paused contract", () => {
    const revoked = contract("X402Facilitator");
    revoked.facilitator!.settlerApproved = { status: "ok", value: false };
    const bad = byId({ ...healthy, contracts: contracts([contract("MockUSDG", { codePresent: false }), revoked]) }).contracts;
    expect(bad).toMatchObject({ status: "bad", summary: "1 address without code", detail: "settler not approved on 1 chain" });
    const paused = byId({ ...healthy, contracts: contracts([contract("MockUSDG", { paused: { status: "ok", value: true } }), contract("X402Facilitator")]) }).contracts;
    expect(paused).toMatchObject({ status: "warn", summary: "1 contract paused" });
  });

  it("separates no settlement yet from an unreadable chain", () => {
    const checks = byId({ ...healthy, payments: payments(chainPayments(421614, null), chainPayments(46630, null, false)) });
    expect(checks["settlement-421614"]).toMatchObject({ status: "warn", summary: "No settlement yet", external: null });
    expect(checks["settlement-46630"]).toMatchObject({ status: "unknown", summary: "RPC unavailable" });
  });

  it("grades CI by the latest run on main", () => {
    expect(byId({ ...healthy, ci: ci({ latest: { ...run, conclusion: "failure" } }) }).ci).toMatchObject({ status: "bad", summary: "Failed" });
    expect(byId({ ...healthy, ci: ci({ latest: { ...run, status: "in_progress", conclusion: null } }) }).ci).toMatchObject({ status: "warn", summary: "Running" });
    expect(byId({ ...healthy, ci: ci({ state: "rate_limited", runs: [], latest: null, rateLimitResetAt: "2026-10-01T17:00:00.000Z" }) }).ci).toMatchObject({ status: "unknown", summary: "GitHub rate limit reached", at: "2026-10-01T17:00:00.000Z" });
    expect(byId({ ...healthy, ci: ci({ state: "stale" }) }).ci).toMatchObject({ status: "ok" });
    expect(byId({ ...healthy, ci: ci({ state: "stale" }) }).ci.detail).toContain("last successful check");
  });

  it("warns when the deployed commit is not the head of main", () => {
    expect(byId({ ...healthy, build: build({ commit: "c7960afca78c50e6051f05d607a09dc096fc0389" }) }).build).toMatchObject({ status: "warn", summary: "c7960af, behind main", detail: "main is at d362ad3." });
    expect(byId({ ...healthy, build: build({ commit: "d362ad3" }) }).build).toMatchObject({ status: "ok" });
    expect(byId({ ...healthy, build: build({ commit: null, commitSource: null }) }).build).toMatchObject({ status: "unknown", summary: "Not recorded" });
  });

  it("turns every missing part into unknown", () => {
    const overview = buildOverview({ balances: null, payments: null, contracts: null, x402: null, ci: null, build: build({ commit: null }) }, "now");
    expect(overview.checks.every((check) => check.status === "unknown")).toBe(true);
    expect(overview.counts.unknown).toBe(overview.checks.length);
  });
});

describe("fetchOverview", () => {
  it("keeps a failing part from failing the rest", async () => {
    const overview = await fetchOverview({}, {
      balances: async () => { throw new Error("rpc down"); },
      payments: async () => healthy.payments!,
      contracts: async () => healthy.contracts!,
      x402: async () => { throw new Error("boom"); },
      ci: async () => healthy.ci!,
      build: () => healthy.build,
    });
    const status = Object.fromEntries(overview.checks.map((check) => [check.id, check.status]));
    expect(status).toMatchObject({ wallets: "unknown", x402: "unknown", contracts: "ok", "settlement-421614": "ok", ci: "ok", build: "ok" });
  });
});
