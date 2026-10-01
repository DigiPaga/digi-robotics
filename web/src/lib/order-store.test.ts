// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createD1OrderStore,
  createFileOrderStore,
  getOrderStore,
  ORDER_TX_CONFLICT,
  type D1Like,
  type OrderStore,
} from "./order-store";
import type { StoredOrder } from "./orders";

const WALLET_A = "0x00000000000000000000000000000000000000AA";
const WALLET_B = "0x00000000000000000000000000000000000000bb";
const tx = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as StoredOrder["txHash"];

function order(n: number, wallet: string, createdAt = `2026-10-01T00:00:0${n}.000Z`): StoredOrder {
  return {
    id: `DR-TEST-${n}`,
    walletAddress: wallet as StoredOrder["walletAddress"],
    paymentAddress: wallet as StoredOrder["paymentAddress"],
    items: [{ id: "glasses", name: "Capture glasses", price: "10.00", quantity: 1 }],
    total: "10.00",
    txHash: tx(n),
    shipping: { name: "Test Buyer", address: "1 Test Street, Testville", phone: "+10000000" },
    status: "Payment confirmed · Fulfillment simulated",
    createdAt,
  };
}

/** The contract both stores must honour. Each case uses its own transaction hashes. */
function orderStoreContract(name: string, store: () => OrderStore, base: number) {
  describe(name, () => {
    it("returns nothing for a wallet without orders", async () => {
      expect(await store().listByWallet(WALLET_B)).toEqual([]);
    });

    it("stores an order and lists it for its wallet only, ignoring address case", async () => {
      const first = order(base + 1, WALLET_A);
      expect(await store().append(first)).toEqual({ order: first, created: true });
      expect(await store().listByWallet(WALLET_A.toLowerCase())).toEqual([first]);
      expect(await store().listByWallet(WALLET_B)).toEqual([]);
    });

    it("keeps one order per transaction and returns the stored one on a repeat", async () => {
      const original = order(base + 2, WALLET_A);
      await store().append(original);
      const repeat = { ...original, id: "DR-TEST-REPEAT", txHash: original.txHash.toUpperCase().replace("0X", "0x") as StoredOrder["txHash"] };
      expect(await store().append(repeat)).toEqual({ order: original, created: false });
      const stored = await store().listByWallet(WALLET_A);
      expect(stored.filter((item) => item.txHash === original.txHash)).toHaveLength(1);
    });

    it("refuses a transaction that already belongs to another wallet", async () => {
      await store().append(order(base + 3, WALLET_A));
      await expect(store().append(order(base + 3, WALLET_B))).rejects.toThrow(ORDER_TX_CONFLICT);
      expect(await store().listByWallet(WALLET_B)).toEqual([]);
    });

    it("stores concurrent appends of the same transaction once", async () => {
      const racing = order(base + 4, WALLET_B);
      const results = await Promise.all([store().append(racing), store().append(racing), store().append(racing)]);
      expect(results.filter((result) => result.created)).toHaveLength(1);
      expect(await store().listByWallet(WALLET_B)).toEqual([racing]);
    });
  });
}

describe("file order store", () => {
  let directory: string;
  let store: OrderStore;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "digi-orders-"));
    store = createFileOrderStore(path.join(directory, "nested", "orders.json"));
  });
  afterAll(() => rm(directory, { recursive: true, force: true }));

  orderStoreContract("contract", () => store, 100);

  it("writes a JSON array that a new store instance reads back", async () => {
    const file = path.join(directory, "nested", "orders.json");
    const onDisk = JSON.parse(await readFile(file, "utf8")) as StoredOrder[];
    expect(onDisk.length).toBeGreaterThan(0);
    expect(await createFileOrderStore(file).listByWallet(WALLET_A)).toEqual(
      onDisk.filter((item) => item.walletAddress === WALLET_A),
    );
  });
});

// Runs against the local D1 that wrangler builds from wrangler.jsonc, so it also proves
// that the ORDERS_DB binding exists under that name and that the SQL is valid SQLite.
// wrangler needs Node 22 or newer; on older Node the suite is skipped.
const wranglerRuns = Number(process.versions.node.split(".")[0]) >= 22;

describe.skipIf(!wranglerRuns)("D1 order store", () => {
  let dispose: (() => Promise<void>) | undefined;
  let bindings: Record<string, unknown>;

  beforeAll(async () => {
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy({ configPath: "wrangler.jsonc", persist: false });
    bindings = proxy.env as Record<string, unknown>;
    dispose = proxy.dispose;
  }, 60_000);
  afterAll(() => dispose?.());

  orderStoreContract("contract", () => createD1OrderStore(bindings.ORDERS_DB as D1Like), 200);

  it("lists a wallet's orders oldest first", async () => {
    const wallet = "0x00000000000000000000000000000000000000cc";
    const store = getOrderStore(bindings);
    await store.append(order(298, wallet, "2026-10-01T10:00:00.000Z"));
    await store.append(order(297, wallet, "2026-10-01T09:00:00.000Z"));
    expect((await store.listByWallet(wallet)).map((item) => item.id)).toEqual(["DR-TEST-297", "DR-TEST-298"]);
  });
});

describe("getOrderStore", () => {
  it("fails loudly on a Worker that has no ORDERS_DB binding", () => {
    expect(() => getOrderStore({})).toThrow("ORDERS_DB");
  });
});
