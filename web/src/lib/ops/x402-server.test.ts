// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache } from "./cache";
import { fetchX402Catalog, fetchX402Health, MAX_DATASETS, readX402ServerUrl } from "./x402-server";

const env = { X402_SERVER_URL: "https://x402.example.test" };

function json(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const dataset = {
  id: "engine-assembly-pov",
  title: "Engine Assembly POV",
  description: "Egocentric torque sequences.",
  tags: ["robotics", "egocentric"],
  mimeType: "application/vnd.digirobotics.dataset+json",
  priceDisplay: "0.05 mUSDG",
  network: "eip155:421614",
  assetSymbol: "mUSDG",
  assetAddress: "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4",
  sellerAddress: "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6",
  resourceUrl: "https://x402.example.test/x402/datasets/engine-assembly-pov/content",
};

beforeEach(() => clearOpsCache());

describe("readX402ServerUrl", () => {
  it("prefers X402_SERVER_URL and falls back to the public backend URL", () => {
    expect(readX402ServerUrl({ X402_SERVER_URL: "https://a.test", NEXT_PUBLIC_X402_BACKEND_URL: "https://b.test" })?.origin).toBe("https://a.test");
    expect(readX402ServerUrl({ NEXT_PUBLIC_X402_BACKEND_URL: "http://localhost:46123" })?.origin).toBe("http://localhost:46123");
  });

  it.each([undefined, "", "   ", "not a url", "ftp://x.test", "javascript:alert(1)", "https://user:pass@x.test"])("rejects %s", (value) => {
    expect(readX402ServerUrl({ X402_SERVER_URL: value })).toBeNull();
  });
});

describe("fetchX402Health", () => {
  it("reports unconfigured without any request", async () => {
    const fetchImpl = json({});
    expect(await fetchX402Health({ env: {}, fetchImpl })).toEqual({ state: "unconfigured", origin: null, mode: null, latencyMs: null, httpStatus: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads status, mode and latency from /health", async () => {
    const fetchImpl = json({ status: "ok", mode: "REAL_MUSDG_X402", timestamp: "2026-10-01T00:00:00Z" });
    const ticks = [10, 55, 55];
    const health = await fetchX402Health({ env, fetchImpl, now: () => ticks.shift() ?? 55 });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://x402.example.test/health");
    expect(health).toMatchObject({ state: "ok", origin: "https://x402.example.test", mode: "REAL_MUSDG_X402", latencyMs: 45, httpStatus: 200 });
  });

  it("keeps a base path and drops a trailing slash", async () => {
    const fetchImpl = json({ status: "ok" });
    await fetchX402Health({ env: { X402_SERVER_URL: "https://host.test/x402/" }, fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://host.test/x402/health");
  });

  it("reports unreachable when the request fails", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    expect(await fetchX402Health({ env, fetchImpl })).toMatchObject({ state: "unreachable", origin: "https://x402.example.test", latencyMs: null });
  });

  it.each([
    ["a 500", json({ error: "INTERNAL_SERVER_ERROR" }, 500), 500],
    ["an unexpected body", json({ hello: "world" }), 200],
    ["a non-ok status field", json({ status: "degraded" }), 200],
  ])("reports invalid on %s", async (_label, fetchImpl, httpStatus) => {
    expect(await fetchX402Health({ env, fetchImpl })).toMatchObject({ state: "invalid", httpStatus, mode: null });
  });

  it("caches per isolate and refetches when fresh", async () => {
    const fetchImpl = json({ status: "ok" });
    await fetchX402Health({ env, fetchImpl });
    await fetchX402Health({ env, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await fetchX402Health({ env, fetchImpl, fresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("fetchX402Catalog", () => {
  it("returns the datasets without the resource url", async () => {
    const fetchImpl = json({ datasets: [dataset] });
    const catalog = await fetchX402Catalog({ env, fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://x402.example.test/agent-demo/catalog");
    expect(catalog.state).toBe("ok");
    expect(catalog.datasets).toEqual([{
      id: dataset.id, title: dataset.title, description: dataset.description, tags: dataset.tags, priceDisplay: dataset.priceDisplay,
      network: dataset.network, assetSymbol: dataset.assetSymbol, assetAddress: dataset.assetAddress, sellerAddress: dataset.sellerAddress,
    }]);
  });

  it("drops malformed entries, truncates long text and caps the list", async () => {
    const many = Array.from({ length: MAX_DATASETS + 20 }, (_, index) => ({ ...dataset, id: `d-${index}`, title: "T".repeat(500) }));
    const catalog = await fetchX402Catalog({ env, fetchImpl: json({ datasets: [{ id: 7 }, null, ...many] }) });
    expect(catalog.datasets).toHaveLength(MAX_DATASETS);
    expect(catalog.datasets[0].id).toBe("d-0");
    expect(catalog.datasets[0].title).toHaveLength(120);
  });

  it("reports unreachable, invalid and unconfigured with an empty list", async () => {
    const down = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    expect(await fetchX402Catalog({ env, fetchImpl: down })).toEqual({ state: "unreachable", origin: "https://x402.example.test", datasets: [] });
    clearOpsCache();
    expect(await fetchX402Catalog({ env, fetchImpl: json({ nope: true }) })).toMatchObject({ state: "invalid", datasets: [] });
    expect(await fetchX402Catalog({ env: {}, fetchImpl: json({}) })).toEqual({ state: "unconfigured", origin: null, datasets: [] });
  });
});
