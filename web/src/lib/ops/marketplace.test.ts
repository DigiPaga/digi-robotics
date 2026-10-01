// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gearItems } from "@/data/gear";
import { clearOpsCache } from "./cache";
import { fetchMarketplace, readOrdersSummary, summarizeGear, summarizeOrders } from "./marketplace";

beforeEach(() => clearOpsCache());

const order = (createdAt: string) => ({
  id: "o1", walletAddress: "0x1", items: [], total: "10.00", txHash: "0x2", createdAt,
  shipping: { name: "Ada Lovelace", address: "12 Private Road", phone: "+34 600 000 000" },
});

describe("summarizeGear", () => {
  it("counts the catalog the public gear page renders", () => {
    const summary = summarizeGear();
    expect(summary.total).toBe(gearItems.length);
    expect(summary.categories.reduce((sum, category) => sum + category.count, 0)).toBe(gearItems.length);
    expect(summary.priced).toBe(gearItems.filter((item) => item.price).length);
  });

  it("groups by category", () => {
    const items = [
      { id: "a", name: "A", description: "", category: "Recording Devices" as const, price: "10.00" },
      { id: "b", name: "B", description: "", category: "Recording Devices" as const },
      { id: "c", name: "C", description: "", category: "Lighting & Environment" as const },
    ];
    expect(summarizeGear(items)).toEqual({ total: 3, priced: 1, categories: [{ name: "Recording Devices", count: 2 }, { name: "Lighting & Environment", count: 1 }] });
  });
});

describe("summarizeOrders", () => {
  it("counts orders and finds the newest without copying shipping details", () => {
    const summary = summarizeOrders([order("2026-09-30T10:00:00Z"), order("2026-10-01T09:30:00Z"), { id: "no-date" }]);
    expect(summary).toEqual({ state: "ok", count: 3, latestAt: "2026-10-01T09:30:00.000Z" });
    expect(JSON.stringify(summary)).not.toMatch(/Ada|Private Road|600/);
  });

  it("reports an empty store and a corrupt one", () => {
    expect(summarizeOrders([])).toEqual({ state: "empty", count: 0, latestAt: null });
    expect(summarizeOrders({ not: "an array" })).toEqual({ state: "unavailable", count: null, latestAt: null });
  });
});

describe("readOrdersSummary", () => {
  it("treats a missing file as an empty store", async () => {
    expect(await readOrdersSummary(async () => null)).toEqual({ state: "empty", count: 0, latestAt: null });
  });

  it("reads the stored orders", async () => {
    expect(await readOrdersSummary(async () => JSON.stringify([order("2026-10-01T09:30:00Z")]))).toMatchObject({ state: "ok", count: 1 });
  });

  it("reports unavailable when the store cannot be read or parsed", async () => {
    expect(await readOrdersSummary(async () => { throw new Error("EACCES"); })).toEqual({ state: "unavailable", count: null, latestAt: null });
    expect(await readOrdersSummary(async () => "{not json")).toMatchObject({ state: "unavailable" });
  });
});

describe("fetchMarketplace", () => {
  it("returns the catalog, gear and orders with two requests to the x402 server", async () => {
    const fetchImpl = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/health")
      ? { status: "ok", mode: "REAL_MUSDG_X402" }
      : { datasets: [{ id: "kitchen-cooking-pov", title: "Kitchen Cooking POV", priceDisplay: "0.05 mUSDG", network: "eip155:421614" }] }))) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    const snapshot = await fetchMarketplace({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test" }, ordersReader: async () => "[]" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(snapshot.x402.state).toBe("ok");
    expect(snapshot.catalog.datasets).toHaveLength(1);
    expect(snapshot.gear.total).toBe(gearItems.length);
    expect(snapshot.orders).toEqual({ state: "empty", count: 0, latestAt: null });
  });

  it("shows a clear unreachable state and still returns local data", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const snapshot = await fetchMarketplace({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test" }, ordersReader: async () => null });
    expect(snapshot.x402.state).toBe("unreachable");
    expect(snapshot.catalog).toEqual({ state: "unreachable", origin: "https://x402.example.test", datasets: [] });
    expect(snapshot.gear.total).toBeGreaterThan(0);
  });

  it("makes no request when no server is configured", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const snapshot = await fetchMarketplace({ fetchImpl, env: {}, ordersReader: async () => null });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(snapshot.catalog.state).toBe("unconfigured");
  });
});
