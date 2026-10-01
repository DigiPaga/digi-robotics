import "server-only";

import { gearItems, type GearItem } from "@/data/gear";
import { fetchX402Catalog, fetchX402Health, type FetchOptions, type X402Catalog, type X402Health } from "./x402-server";

export interface GearSummary {
  total: number;
  priced: number;
  categories: { name: string; count: number }[];
}

/**
 * - ok: orders are stored and counted.
 * - empty: the store exists but holds nothing yet (no order file).
 * - unavailable: this runtime cannot read the store.
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

/** Pure. Counts orders and finds the newest. Shipping details are never copied out. */
export function summarizeOrders(parsed: unknown): OrdersSummary {
  if (!Array.isArray(parsed)) return { state: "unavailable", count: null, latestAt: null };
  let latest = 0;
  for (const order of parsed) {
    const created = Date.parse((order as { createdAt?: unknown } | null)?.createdAt as string);
    if (Number.isFinite(created) && created > latest) latest = created;
  }
  return { state: parsed.length > 0 ? "ok" : "empty", count: parsed.length, latestAt: latest > 0 ? new Date(latest).toISOString() : null };
}

export type OrdersReader = () => Promise<string | null>;

/**
 * Reads the same file /api/orders appends to (data/orders.json), read-only.
 * The file store only exists on a Node.js host: on Cloudflare Workers this
 * returns "unavailable" without touching the filesystem. Null means no file yet.
 */
const readOrdersFile: OrdersReader = async () => {
  if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") throw new Error("no file store");
  const [{ readFile }, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  try {
    return await readFile(path.join(process.cwd(), "data", "orders.json"), "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return null;
    throw error;
  }
};

export async function readOrdersSummary(reader: OrdersReader = readOrdersFile): Promise<OrdersSummary> {
  try {
    const raw = await reader();
    if (raw === null) return { state: "empty", count: 0, latestAt: null };
    return summarizeOrders(JSON.parse(raw));
  } catch {
    return { state: "unavailable", count: null, latestAt: null };
  }
}

export interface MarketplaceOptions extends FetchOptions {
  ordersReader?: OrdersReader;
}

/** Request budget: two calls to the x402 server (/health and the catalog). No RPC. */
export async function fetchMarketplace(options: MarketplaceOptions = {}): Promise<MarketplaceSnapshot> {
  const [x402, catalog, orders] = await Promise.all([
    fetchX402Health(options),
    fetchX402Catalog(options),
    readOrdersSummary(options.ordersReader),
  ]);
  return { refreshedAt: new Date().toISOString(), x402, catalog, gear: summarizeGear(), orders };
}
