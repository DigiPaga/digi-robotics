// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gearItems } from "@/data/gear";
import { clearOpsCache } from "./cache";
import { fetchMarketplace, readOrdersSummary, summarizeGear } from "./marketplace";

beforeEach(() => clearOpsCache());

const none = async () => ({ total: 0, latestAt: null });

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

describe("readOrdersSummary", () => {
  it("reports an empty store", async () => {
    expect(await readOrdersSummary(none)).toEqual({ state: "empty", count: 0, latestAt: null });
  });

  it("reports the stored total and the newest order", async () => {
    expect(await readOrdersSummary(async () => ({ total: 3, latestAt: "2026-10-01T09:30:00.000Z" })))
      .toEqual({ state: "ok", count: 3, latestAt: "2026-10-01T09:30:00.000Z" });
  });

  it("reports unavailable when the store cannot be read", async () => {
    expect(await readOrdersSummary(async () => { throw new Error("The ORDERS_DB D1 binding is not configured."); }))
      .toEqual({ state: "unavailable", count: null, latestAt: null });
  });

  it("counts the order store by default", async () => {
    // Off Workers the default store is data/orders.json, committed as an empty array.
    expect(await readOrdersSummary()).toEqual({ state: "empty", count: 0, latestAt: null });
  });
});

describe("fetchMarketplace", () => {
  it("returns the catalog, gear and orders with two requests to the x402 server", async () => {
    const fetchImpl = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/health")
      ? { status: "ok", mode: "REAL_MUSDG_X402" }
      : { datasets: [{ id: "kitchen-cooking-pov", title: "Kitchen Cooking POV", priceDisplay: "0.05 mUSDG", network: "eip155:421614" }] }))) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    const snapshot = await fetchMarketplace({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test" }, ordersCounter: none });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(snapshot.x402.state).toBe("ok");
    expect(snapshot.catalog.datasets).toHaveLength(1);
    expect(snapshot.gear.total).toBe(gearItems.length);
    expect(snapshot.orders).toEqual({ state: "empty", count: 0, latestAt: null });
  });

  it("shows a clear unreachable state and still returns local data", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const snapshot = await fetchMarketplace({ fetchImpl, env: { X402_SERVER_URL: "https://x402.example.test" }, ordersCounter: none });
    expect(snapshot.x402.state).toBe("unreachable");
    expect(snapshot.catalog).toEqual({ state: "unreachable", origin: "https://x402.example.test", datasets: [] });
    expect(snapshot.gear.total).toBeGreaterThan(0);
  });

  it("makes no request when no server is configured", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const snapshot = await fetchMarketplace({ fetchImpl, env: {}, ordersCounter: none });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(snapshot.catalog.state).toBe("unconfigured");
  });
});
