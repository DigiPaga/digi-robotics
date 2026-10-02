import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { StoredOrder } from "@/lib/orders";

/**
 * Where recorded orders live. One order per payment transaction: appending a
 * transaction that is already stored returns the stored order instead of a copy.
 */
export interface OrderStore {
  listByWallet(walletAddress: string): Promise<StoredOrder[]>;
  append(order: StoredOrder): Promise<{ order: StoredOrder; created: boolean }>;
  /** How many orders are stored and when the newest was created. No order content leaves the store. */
  count(): Promise<OrderCount>;
}

export interface OrderCount {
  total: number;
  /** ISO timestamp of the newest order, or null when there is none with a valid date. */
  latestAt: string | null;
}

export const ORDER_TX_CONFLICT = "This transaction is already associated with another order.";

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Normalizes a stored createdAt to ISO, or null when it is missing or not a date. */
function isoOrNull(value: unknown): string | null {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function resolveExisting(existing: StoredOrder, incoming: StoredOrder) {
  if (!sameAddress(existing.walletAddress, incoming.walletAddress)) throw new Error(ORDER_TX_CONFLICT);
  return { order: existing, created: false };
}

/** JSON file on local disk. Used by `next dev` and `next start`, where the filesystem is writable. */
export function createFileOrderStore(dataPath: string): OrderStore {
  let writeQueue: Promise<unknown> = Promise.resolve();

  async function readOrders(): Promise<StoredOrder[]> {
    try {
      const parsed = JSON.parse(await readFile(dataPath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  return {
    async listByWallet(walletAddress) {
      return (await readOrders()).filter((order) => sameAddress(order.walletAddress, walletAddress));
    },
    append(order) {
      const task = writeQueue.then(async () => {
        const orders = await readOrders();
        const existing = orders.find((candidate) => sameAddress(candidate.txHash, order.txHash));
        if (existing) return resolveExisting(existing, order);
        await mkdir(path.dirname(dataPath), { recursive: true });
        const tempPath = `${dataPath}.${process.pid}.tmp`;
        await writeFile(tempPath, `${JSON.stringify([...orders, order], null, 2)}\n`, "utf8");
        await rename(tempPath, dataPath);
        return { order, created: true };
      });
      writeQueue = task.catch(() => undefined);
      return task;
    },
    async count() {
      const orders = await readOrders();
      let latest = 0;
      for (const order of orders) {
        const created = Date.parse(order?.createdAt);
        if (Number.isFinite(created) && created > latest) latest = created;
      }
      return { total: orders.length, latestAt: latest > 0 ? new Date(latest).toISOString() : null };
    },
  };
}

/** The part of the Cloudflare D1 binding this store uses. */
export interface D1Like {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown>;
}

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  run(): Promise<{ meta: { changes?: number } }>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

export const ORDERS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orders (
    tx_hash TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS orders_wallet_created ON orders (wallet_address, created_at)",
];

const schemaReady = new WeakMap<D1Like, Promise<unknown>>();

/** Idempotent DDL, run at most once per database handle. */
function ensureSchema(db: D1Like): Promise<unknown> {
  let ready = schemaReady.get(db);
  if (!ready) {
    ready = db.batch(ORDERS_SCHEMA.map((statement) => db.prepare(statement)));
    schemaReady.set(db, ready);
    ready.catch(() => schemaReady.delete(db));
  }
  return ready;
}

/**
 * Cloudflare D1. Workers have no writable filesystem, so this replaces the JSON file there.
 * The transaction hash is the primary key, which makes the insert-or-return-existing step
 * atomic across concurrent requests and isolates.
 */
export function createD1OrderStore(db: D1Like): OrderStore {
  return {
    async listByWallet(walletAddress) {
      await ensureSchema(db);
      const { results } = await db
        .prepare("SELECT payload FROM orders WHERE wallet_address = ?1 ORDER BY created_at, tx_hash")
        .bind(walletAddress.toLowerCase())
        .all<{ payload: string }>();
      return results.map((row) => JSON.parse(row.payload) as StoredOrder);
    },
    async append(order) {
      await ensureSchema(db);
      const txHash = order.txHash.toLowerCase();
      const inserted = await db
        .prepare(
          "INSERT INTO orders (tx_hash, wallet_address, created_at, payload) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (tx_hash) DO NOTHING",
        )
        .bind(txHash, order.walletAddress.toLowerCase(), order.createdAt, JSON.stringify(order))
        .run();
      if (inserted.meta.changes === 1) return { order, created: true };
      const row = await db.prepare("SELECT payload FROM orders WHERE tx_hash = ?1").bind(txHash).first<{ payload: string }>();
      if (!row) throw new Error("The order could not be stored.");
      return resolveExisting(JSON.parse(row.payload) as StoredOrder, order);
    },
    async count() {
      await ensureSchema(db);
      const row = await db
        .prepare("SELECT COUNT(*) AS total, MAX(created_at) AS latest_at FROM orders")
        .first<{ total: number; latest_at: string | null }>();
      return { total: Number(row?.total ?? 0), latestAt: isoOrNull(row?.latest_at) };
    },
  };
}

/** Bindings of the Worker this request runs in, or undefined on plain Node (next dev, next start, tests). */
function cloudflareBindings(): Record<string, unknown> | undefined {
  try {
    return getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

let fileStore: OrderStore | undefined;

/**
 * D1 on Cloudflare Workers, the JSON file everywhere else. A Worker without the
 * ORDERS_DB binding is a deployment mistake, so it fails instead of falling back to
 * a filesystem that cannot be written.
 */
export function getOrderStore(bindings: Record<string, unknown> | undefined = cloudflareBindings()): OrderStore {
  if (!bindings) {
    fileStore ??= createFileOrderStore(path.join(process.cwd(), "data", "orders.json"));
    return fileStore;
  }
  const db = bindings.ORDERS_DB as D1Like | undefined;
  if (typeof db?.prepare !== "function") throw new Error("The ORDERS_DB D1 binding is not configured.");
  return createD1OrderStore(db);
}
