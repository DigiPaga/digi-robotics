// @vitest-environment node
import { encodeAbiParameters, toFunctionSelector } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache } from "./cache";
import { fetchContracts, probe, readChainContracts, summarizeContracts } from "./contracts";
import { OPS_DEPLOYMENTS, OPS_SETTLER } from "./deployments";

const D = OPS_DEPLOYMENTS[421614];
const OWNER = "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6";

const SEL = {
  owner: toFunctionSelector("owner()"),
  pendingOwner: toFunctionSelector("pendingOwner()"),
  paused: toFunctionSelector("paused()"),
  name: toFunctionSelector("name()"),
  symbol: toFunctionSelector("symbol()"),
  version: toFunctionSelector("version()"),
  decimals: toFunctionSelector("decimals()"),
  token: toFunctionSelector("token()"),
  isSettler: toFunctionSelector("isSettler(address)"),
} as const;

const enc = {
  address: (value: string) => encodeAbiParameters([{ type: "address" }], [value as `0x${string}`]),
  bool: (value: boolean) => encodeAbiParameters([{ type: "bool" }], [value]),
  string: (value: string) => encodeAbiParameters([{ type: "string" }], [value]),
  uint8: (value: number) => encodeAbiParameters([{ type: "uint8" }], [value]),
};

const REVERT = { error: { code: 3, message: "execution reverted" } };

interface Overrides {
  code?: (address: string) => unknown;
  settlerApproved?: boolean;
  facilitatorToken?: string;
  tokenPaused?: unknown;
}

/** Answers like the live deployment: V1 registry/marketplace have neither owner() nor paused(). */
function node(overrides: Overrides = {}) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const calls = JSON.parse(init.body as string) as { id: number; method: string; params: [string | { to: string; data: string }, string] }[];
    return new Response(JSON.stringify(calls.map((call) => {
      if (call.method === "eth_getCode") return { id: call.id, result: overrides.code ? overrides.code(call.params[0] as string) : "0x6080" };
      const { to, data } = call.params[0] as { to: string; data: string };
      const selector = data.slice(0, 10);
      if (to === D.X402Facilitator.address) {
        if (selector === SEL.owner) return { id: call.id, result: enc.address(OWNER) };
        if (selector === SEL.pendingOwner) return { id: call.id, result: enc.address("0x0000000000000000000000000000000000000000") };
        if (selector === SEL.token) return { id: call.id, result: enc.address(overrides.facilitatorToken ?? D.MockUSDG.address) };
        if (selector === SEL.isSettler) return { id: call.id, result: enc.bool(overrides.settlerApproved ?? true) };
      }
      if (to === D.MockUSDG.address) {
        if (selector === SEL.name) return { id: call.id, result: enc.string("Mock USDG (Demo)") };
        if (selector === SEL.symbol) return { id: call.id, result: enc.string("mUSDG") };
        if (selector === SEL.version) return { id: call.id, result: enc.string("1") };
        if (selector === SEL.decimals) return { id: call.id, result: enc.uint8(6) };
        if (selector === SEL.paused && overrides.tokenPaused !== undefined) return { id: call.id, ...(overrides.tokenPaused as object) };
      }
      return { id: call.id, ...REVERT };
    })));
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("probe", () => {
  it("separates a missing function from an RPC failure", () => {
    expect(probe({ ok: false, reason: "reverted", code: 3 }, "owner", String)).toEqual({ status: "absent" });
    expect(probe({ ok: true, result: "0x" }, "owner", String)).toEqual({ status: "absent" });
    expect(probe({ ok: true, result: "0x1234" }, "owner", String)).toEqual({ status: "absent" });
    expect(probe({ ok: false, reason: "timeout", code: null }, "owner", String)).toEqual({ status: "error" });
    expect(probe(undefined, "owner", String)).toEqual({ status: "error" });
  });
});

describe("readChainContracts", () => {
  it("reads all four contracts of a chain in one request", async () => {
    const fetchImpl = node();
    const chain = await readChainContracts(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).length).toBeLessThanOrEqual(40);
    expect(chain).toMatchObject({ chainId: 421614, reachable: true, explorer: "https://sepolia.arbiscan.io" });
    expect(chain.contracts.map((contract) => contract.key)).toEqual(["MockUSDG", "X402Facilitator", "AgentRegistry", "RoboticsMarketplace"]);

    const [token, facilitator, registry, marketplace] = chain.contracts;
    expect(token).toMatchObject({
      codePresent: true,
      owner: { status: "absent" },
      paused: { status: "absent" },
      token: { name: { status: "ok", value: "Mock USDG (Demo)" }, symbol: { status: "ok", value: "mUSDG" }, version: { status: "ok", value: "1" }, decimals: { status: "ok", value: 6 }, decimalsMatch: true },
      facilitator: null,
    });
    expect(facilitator).toMatchObject({
      owner: { status: "ok", value: OWNER },
      paused: { status: "absent" },
      facilitator: {
        token: { status: "ok", value: D.MockUSDG.address },
        tokenMatches: true,
        settler: OPS_SETTLER,
        settlerApproved: { status: "ok", value: true },
        pendingOwner: { status: "absent" },
      },
    });
    for (const contract of [registry, marketplace]) {
      expect(contract).toMatchObject({ codePresent: true, owner: { status: "absent" }, paused: { status: "absent" }, token: null, facilitator: null });
    }
  });

  it("reports missing code, a revoked settler, a foreign token and a paused contract", async () => {
    const fetchImpl = node({
      code: (address) => (address === D.AgentRegistry.address ? "0x" : "0x6080"),
      settlerApproved: false,
      facilitatorToken: "0x00000000000000000000000000000000000000aa",
      tokenPaused: { result: enc.bool(true) },
    });
    const chain = await readChainContracts(421614, { fetchImpl });
    const [token, facilitator, registry] = chain.contracts;
    expect(registry.codePresent).toBe(false);
    expect(token.paused).toEqual({ status: "ok", value: true });
    expect(facilitator.facilitator).toMatchObject({ tokenMatches: false, settlerApproved: { status: "ok", value: false } });
    expect(summarizeContracts({ refreshedAt: "", settler: OPS_SETTLER, chains: [chain] })).toEqual({
      missingCode: 1, paused: 1, settlerNotApproved: 1, tokenMismatch: 1, unknown: 0, total: 4,
    });
  });

  it("marks everything unknown, not absent, when the RPC is down", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const chain = await readChainContracts(46630, { fetchImpl });
    expect(chain.reachable).toBe(false);
    for (const contract of chain.contracts) {
      expect(contract.codePresent).toBeNull();
      expect(contract.owner).toEqual({ status: "error" });
      expect(contract.paused).toEqual({ status: "error" });
    }
    const health = summarizeContracts({ refreshedAt: "", settler: OPS_SETTLER, chains: [chain] });
    expect(health).toMatchObject({ missingCode: 0, paused: 0, settlerNotApproved: 0 });
    expect(health.unknown).toBeGreaterThan(0);
  });
});

describe("fetchContracts", () => {
  beforeEach(() => clearOpsCache());

  it("isolates a failing chain and costs one request per chain", async () => {
    const good = node();
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("robinhood")) throw new TypeError("fetch failed");
      return good(url, init);
    }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    const snapshot = await fetchContracts({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(snapshot.chains.map((chain) => [chain.chainId, chain.reachable])).toEqual([[421614, true], [46630, false]]);
    expect(snapshot.settler).toBe(OPS_SETTLER);
    await fetchContracts({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
