import "server-only";

import { gearItems, type GearItem } from "@/data/gear";
import { getOrderStore, type OrderCount } from "@/lib/order-store";
import { fetchX402Catalog, fetchX402Health, type FetchOptions, type X402Catalog, type X402Health } from "./x402-server";

export interface GearSummary {
  total: number;
  priced: number;
  categories: { name: string; count: number }[];
}

/**
 * - ok: orders are stored and counted.
 * - empty: the store exists but holds nothing yet.
 * - unavailable: the store could not be read (missing binding, database or file error).
 */
export interface OrdersSummary {
  state: "ok" | "empty" | "unavailable";
  count: number | null;
  latestAt: string | null;
}

export interface MarketplaceSnapshot {
  refreshedAt: string;
  x402: X402Health;
  catalog: X402Catalog;
  gear: GearSummary;
  orders: OrdersSummary;
}

/** Pure. */
export function summarizeGear(items: readonly GearItem[] = gearItems): GearSummary {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return {
    total: items.length,
    priced: items.filter((item) => Boolean(item.price)).length,
    categories: [...counts].map(([name, count]) => ({ name, count })),
  };
}

export type OrdersCounter = () => Promise<OrderCount>;

/**
 * Counts the store /api/orders writes to: D1 (ORDERS_DB) on Cloudflare Workers,
 * data/orders.json on a Node.js host. Only the total and the newest date are read.
 */
const countStoredOrders: OrdersCounter = () => getOrderStore().count();

export async function readOrdersSummary(counter: OrdersCounter = countStoredOrders): Promise<OrdersSummary> {
  try {
    const { total, latestAt } = await counter();
    return { state: total > 0 ? "ok" : "empty", count: total, latestAt };
  } catch {
    return { state: "unavailable", count: null, latestAt: null };
  }
}

export interface MarketplaceOptions extends FetchOptions {
  ordersCounter?: OrdersCounter;
}

/** Request budget: two calls to the x402 server (/health and the catalog). No RPC. */
export async function fetchMarketplace(options: MarketplaceOptions = {}): Promise<MarketplaceSnapshot> {
  const [x402, catalog, orders] = await Promise.all([
    fetchX402Health(options),
    fetchX402Catalog(options),
    readOrdersSummary(options.ordersCounter),
  ]);
  return { refreshedAt: new Date().toISOString(), x402, catalog, gear: summarizeGear(), orders };
}
