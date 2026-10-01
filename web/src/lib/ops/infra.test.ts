// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache } from "./cache";
import { clearGithubFallback } from "./github";
import { fetchInfra, readBuildInfo, readConfigSanity, readRpcStatus } from "./infra";

beforeEach(() => {
  clearOpsCache();
  clearGithubFallback();
});

function node(blockNumber: number, timestamp: number, chainId: number) {
  return (calls: { id: number; method: string }[]) => calls.map((call) => ({
    id: call.id,
    result: call.method === "eth_chainId" ? `0x${chainId.toString(16)}` : { number: `0x${blockNumber.toString(16)}`, timestamp: `0x${timestamp.toString(16)}` },
  }));
}

describe("readRpcStatus", () => {
  it("reports latency, latest block and block age per chain, one request each", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      const calls = JSON.parse(init.body as string);
      return new Response(JSON.stringify(url.includes("robinhood") ? node(127_214_827, 1_790_000_000, 46630)(calls) : node(314_693_208, 1_790_000_030, 421614)(calls)));
    }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    let clock = 1_790_000_040_000;
    const status = await readRpcStatus({ fetchImpl, now: () => (clock += 20) });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(status[0]).toMatchObject({ chainId: 421614, host: "sepolia-rollup.arbitrum.io", ok: true, blockNumber: 314_693_208, chainIdMatches: true, blockTime: new Date(1_790_000_030_000).toISOString() });
    expect(status[0].latencyMs).toBeGreaterThan(0);
    expect(status[0].blockAgeSeconds).toBe(10);
    expect(status[1]).toMatchObject({ chainId: 46630, host: "rpc.testnet.chain.robinhood.com", ok: true, blockNumber: 127_214_827 });
    expect(status[1].blockAgeSeconds).toBe(40);
  });

  it("isolates a dead endpoint and flags a wrong chain id", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("robinhood")) throw new TypeError("fetch failed");
      return new Response(JSON.stringify(node(10, 1_790_000_000, 1)(JSON.parse(init.body as string))));
    }) as unknown as typeof fetch;
    const [arbitrum, robinhood] = await readRpcStatus({ fetchImpl });
    expect(arbitrum).toMatchObject({ ok: true, chainIdMatches: false });
    expect(robinhood).toEqual({ chainId: 46630, name: "Robinhood Chain Testnet", host: "rpc.testnet.chain.robinhood.com", ok: false, latencyMs: null, blockNumber: null, blockTime: null, blockAgeSeconds: null, chainIdMatches: null });
  });
});

describe("readBuildInfo", () => {
  it("takes the first variable that holds a commit hash", () => {
    expect(readBuildInfo({ WORKERS_CI_COMMIT_SHA: "D362AD3561850360ABBA2459F4EE38D7B0DDF53D", GITHUB_SHA: "c7960afca78c50e6051f05d607a09dc096fc0389", NODE_ENV: "production" }))
      .toMatchObject({ commit: "d362ad3561850360abba2459f4ee38d7b0ddf53d", commitSource: "WORKERS_CI_COMMIT_SHA", nodeEnv: "production" });
    expect(readBuildInfo({ NEXT_PUBLIC_COMMIT_SHA: "d362ad3", GITHUB_SHA: "c7960af" })).toMatchObject({ commit: "d362ad3", commitSource: "NEXT_PUBLIC_COMMIT_SHA" });
  });

  it("rejects anything that is not a hash and reports nothing recorded", () => {
    expect(readBuildInfo({ NEXT_PUBLIC_COMMIT_SHA: "<script>", GITHUB_SHA: "main" })).toMatchObject({ commit: null, commitSource: null, builtAt: null, nodeEnv: "development" });
  });

  it("parses the build time as ISO or unix seconds", () => {
    expect(readBuildInfo({ NEXT_PUBLIC_BUILD_TIME: "2026-10-01T16:00:00Z" }).builtAt).toBe("2026-10-01T16:00:00.000Z");
    expect(readBuildInfo({ NEXT_PUBLIC_BUILD_TIME: "1790000000" }).builtAt).toBe(new Date(1_790_000_000_000).toISOString());
    expect(readBuildInfo({ NEXT_PUBLIC_BUILD_TIME: "yesterday" }).builtAt).toBeNull();
  });

  it("names the runtime", () => {
    expect(readBuildInfo({}).runtime).toMatch(/^Node\.js \d+$/);
  });
});

describe("readConfigSanity", () => {
  const env = {
    X402_SERVER_URL: "https://secret-host.internal.example/x402",
    OPS_WALLETS: JSON.stringify([{ label: "Hot", address: "0x00000000000000000000000000000000000000a1", role: "private-role", minEth: 0.5 }]),
    X402_PAY_TO: "0x00000000000000000000000000000000000000b2",
    KIT_API_KEY: "kit_live_abcdef",
    NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: "0xbbb4155d20d739faabc3af41a3344faefd76ddd4",
    NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD: "0x00000000000000000000000000000000000000c3",
  };

  it("reports which optional variables are set", () => {
    const { items } = readConfigSanity(env);
    const set = Object.fromEntries(items.map((item) => [item.name, item.set]));
    expect(set).toMatchObject({ X402_SERVER_URL: true, OPS_WALLETS: true, X402_PAY_TO: true, KIT_API_KEY: true, OPS_BASE_URL: false, NEXT_PUBLIC_COMMIT_SHA: false });
    expect(readConfigSanity({ OPS_BASE_URL: "   " }).items.find((item) => item.name === "OPS_BASE_URL")?.set).toBe(false);
  });

  it("never returns a value, only names and booleans", () => {
    const serialized = JSON.stringify(readConfigSanity(env));
    for (const secret of ["secret-host", "kit_live", "private-role", "00a1", "00b2", "00c3", "bbb4155d", "BbB4155d"]) expect(serialized).not.toContain(secret);
  });

  it("never lists a required secret, set or not", () => {
    const names = readConfigSanity({ GOOGLE_CLIENT_SECRET: "x", OPS_SESSION_SECRET: "y".repeat(40) }).items.map((item) => item.name);
    expect(names).not.toContain("GOOGLE_CLIENT_SECRET");
    expect(names).not.toContain("OPS_SESSION_SECRET");
    expect(names).not.toContain("OPS_ALLOWED_EMAILS");
  });

  it("checks the token addresses against the deployment record", () => {
    const { checks } = readConfigSanity(env);
    expect(checks[0]).toMatchObject({ ok: true });
    expect(checks[1]).toMatchObject({ ok: false });
    expect(readConfigSanity({}).checks.map((check) => check.ok)).toEqual([null, null, null, null]);
    expect(readConfigSanity({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD: "nope", OPS_WALLETS: "{", X402_PAY_TO: "0x12" }).checks.map((check) => check.ok)).toEqual([null, false, false, false]);
  });
});

describe("fetchInfra", () => {
  it("combines the parts and stays within four upstream requests", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("https://api.github.com/")) return new Response(JSON.stringify({ workflow_runs: [] }));
      if (url.startsWith("https://x402.example.test/")) return new Response(JSON.stringify({ status: "ok", mode: "BLOCKED" }));
      return new Response(JSON.stringify(node(5, 1_790_000_000, url.includes("robinhood") ? 46630 : 421614)(JSON.parse(init!.body as string))));
    }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    const snapshot = await fetchInfra({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test", NEXT_PUBLIC_COMMIT_SHA: "abc1234" } });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(snapshot.rpc.map((item) => item.ok)).toEqual([true, true]);
    expect(snapshot.x402).toMatchObject({ state: "ok", mode: "BLOCKED" });
    expect(snapshot.ci).toMatchObject({ state: "ok", latest: null });
    expect(snapshot.build.commit).toBe("abc1234");
    expect(snapshot.config.items.length).toBeGreaterThan(5);
  });

  it("still answers when every upstream is down", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const snapshot = await fetchInfra({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test" } });
    expect(snapshot.rpc.every((item) => !item.ok)).toBe(true);
    expect(snapshot.x402.state).toBe("unreachable");
    expect(snapshot.ci.state).toBe("unavailable");
  });
});
