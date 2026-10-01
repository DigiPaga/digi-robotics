// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache } from "./cache";
import { OPS_DEPLOYMENTS } from "./deployments";
import { decodePaymentLogs, FALLBACK_WINDOWS, fetchPayments, readChainPayments, summarizePayments, type RawLog } from "./payments";

const TOKEN = OPS_DEPLOYMENTS[421614].MockUSDG.address;
const FACILITATOR = OPS_DEPLOYMENTS[421614].X402Facilitator.address;
const contracts = { token: TOKEN, facilitator: FACILITATOR };

const T_AUTH = "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
const T_TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const T_SETTLED = "0x21c4c9fa53b024295f1a8de8f96f330047691321ed61a006d0bf273df5ddfde2";

const PAYER = "0xf16f0871811a545214f9f39ec6a8ac84fdba9fe3";
const PAYEE = "0x962b67f92e9bafc3a584fe2ea3ad871aca3509d6";
const SETTLER = "0xd98ac3064b36dfb19b62558d48cb16f00105f473";
const NONCE = "0x691afb173debddb70c5f1e332dd8a649e289196480d357bbb53e98dcbc70ddc1";
const RESOURCE = "0x736767f72798068d29c6ebd9c565e7deed110d0df651a21ad8812272d7d47f4d";
const TX = "0xd2d5a3851db8723f65c1c441d3fa83f468443f6860b1a1ab82efe002dd521d89";

const pad = (address: string) => `0x${address.slice(2).padStart(64, "0")}`;
const word = (value: number | bigint) => value.toString(16).padStart(64, "0");

/** The three logs of the real Arbitrum Sepolia settlement (tx 0xd2d5a385..., block 314674503). */
const settlementLogs: RawLog[] = [
  { address: TOKEN.toLowerCase(), topics: [T_AUTH, pad(PAYER), NONCE], data: "0x", blockNumber: "0x12c18d47", transactionHash: TX, logIndex: "0x6", blockTimestamp: "0x6abe7714" },
  { address: TOKEN.toLowerCase(), topics: [T_TRANSFER, pad(PAYER), pad(PAYEE)], data: `0x${word(50_000)}`, blockNumber: "0x12c18d47", transactionHash: TX, logIndex: "0x7", blockTimestamp: "0x6abe7714" },
  { address: FACILITATOR.toLowerCase(), topics: [T_SETTLED, RESOURCE, pad(PAYER), pad(PAYEE)], data: `0x${word(50_000)}${NONCE.slice(2)}${pad(SETTLER).slice(2)}`, blockNumber: "0x12c18d47", transactionHash: TX, logIndex: "0x8", blockTimestamp: "0x6abe7714" },
];

function transfer(from: string, to: string, value: number, block: number, index: number, tx: string, extra: Partial<RawLog> = {}): RawLog {
  return { address: TOKEN, topics: [T_TRANSFER, pad(from), pad(to)], data: `0x${word(value)}`, blockNumber: `0x${block.toString(16)}`, transactionHash: tx, logIndex: `0x${index.toString(16)}`, ...extra };
}

const ZERO = "0x0000000000000000000000000000000000000000";
const tx = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;

describe("decodePaymentLogs", () => {
  it("decodes a facilitator settlement into one settled row", () => {
    const rows = decodePaymentLogs(421614, settlementLogs, contracts);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      chainId: 421614,
      kind: "settled",
      txHash: TX,
      logIndex: 7,
      blockNumber: 314674503,
      timestamp: new Date(0x6abe7714 * 1000).toISOString(),
      from: "0xF16f0871811A545214f9f39EC6a8Ac84FdbA9fe3",
      to: "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6",
      amountAtomic: "50000",
      amount: "0.05",
      resourceId: RESOURCE,
      nonce: NONCE,
      settler: "0xd98aC3064B36dFb19b62558d48cB16f00105F473",
    });
  });

  it("classifies a direct authorization, a mint and a plain transfer", () => {
    const direct: RawLog[] = [
      { address: TOKEN, topics: [T_AUTH, pad(PAYER), NONCE], data: "0x", blockNumber: "0x10", transactionHash: tx(1), logIndex: "0x0" },
      transfer(PAYER, PAYEE, 70_000, 16, 1, tx(1)),
    ];
    const rows = decodePaymentLogs(421614, [...direct, transfer(ZERO, PAYER, 1_000_000_000, 5, 0, tx(2)), transfer(PAYEE, SETTLER, 10, 9, 3, tx(3))], contracts);
    expect(rows.map((row) => [row.kind, row.blockNumber])).toEqual([["authorization", 16], ["transfer", 9], ["mint", 5]]);
    expect(rows[0]).toMatchObject({ nonce: NONCE, resourceId: null, settler: null, amount: "0.07" });
    expect(rows[2]).toMatchObject({ amount: "1000", nonce: null });
  });

  it("only pairs an authorization with a later transfer from the same account, once", () => {
    const logs: RawLog[] = [
      transfer(PAYER, PAYEE, 1, 20, 0, tx(4)),
      { address: TOKEN, topics: [T_AUTH, pad(PAYER), NONCE], data: "0x", blockNumber: "0x14", transactionHash: tx(4), logIndex: "0x1" },
      transfer(SETTLER, PAYEE, 2, 20, 2, tx(4)),
      transfer(PAYER, PAYEE, 3, 20, 3, tx(4)),
      transfer(PAYER, PAYEE, 4, 20, 4, tx(4)),
    ];
    const rows = decodePaymentLogs(421614, logs, contracts);
    expect(rows.map((row) => [row.logIndex, row.kind])).toEqual([[4, "transfer"], [3, "authorization"], [2, "transfer"], [0, "transfer"]]);
  });

  it("skips foreign contracts, removed logs and malformed entries", () => {
    const foreign = { ...settlementLogs[1], address: "0x00000000000000000000000000000000000000aa", transactionHash: tx(9) };
    const removed = { ...transfer(PAYER, PAYEE, 5, 30, 0, tx(10)), removed: true };
    const badData = { ...transfer(PAYER, PAYEE, 5, 31, 0, tx(11)), data: "0x12" };
    const rows = decodePaymentLogs(421614, [foreign, removed, badData, null, "nope", { address: TOKEN }], contracts);
    expect(rows).toEqual([]);
  });

  it("ignores a PaymentSettled emitted by anything but the facilitator", () => {
    const spoofed = settlementLogs.map((log, index) => (index === 2 ? { ...log, address: "0x00000000000000000000000000000000000000aa" } : log));
    expect(decodePaymentLogs(421614, spoofed, contracts)[0]).toMatchObject({ kind: "authorization", resourceId: null });
  });

  it("falls back to looked-up block timestamps and to null", () => {
    const logs = [transfer(PAYER, PAYEE, 5, 40, 0, tx(12)), transfer(PAYER, PAYEE, 5, 41, 0, tx(13))];
    const rows = decodePaymentLogs(421614, logs, contracts, new Map([[40, 1_700_000_000]]));
    expect(rows.map((row) => row.timestamp)).toEqual([null, new Date(1_700_000_000_000).toISOString()]);
  });
});

describe("summarizePayments", () => {
  it("counts payments, volume and unique payers, and leaves mints and transfers out", () => {
    const rows = decodePaymentLogs(421614, [
      ...settlementLogs,
      { address: TOKEN, topics: [T_AUTH, pad(PAYER), NONCE], data: "0x", blockNumber: "0x10", transactionHash: tx(1), logIndex: "0x0" },
      transfer(PAYER, PAYEE, 70_000, 16, 1, tx(1)),
      transfer(ZERO, PAYER, 1_000_000_000, 5, 0, tx(2)),
    ], contracts);
    expect(summarizePayments(rows)).toEqual({ payments: 2, settled: 1, volumeAtomic: "120000", volume: "0.12", uniquePayers: 1, otherTransfers: 1 });
    expect(summarizePayments([])).toEqual({ payments: 0, settled: 0, volumeAtomic: "0", volume: "0", uniquePayers: 0, otherTransfers: 0 });
  });
});

type Handler = (calls: { id: number; method: string; params: unknown[] }[]) => unknown;

function rpc(handler: Handler) {
  return vi.fn(async (_url: string, init: RequestInit) => new Response(JSON.stringify(handler(JSON.parse(init.body as string))))) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const HEAD = 314_700_000;

describe("readChainPayments", () => {
  it("reads head and logs in a single request, bounded below by the deploy block", async () => {
    const fetchImpl = rpc((calls) => calls.map((call) => ({ id: call.id, result: call.method === "eth_blockNumber" ? `0x${HEAD.toString(16)}` : settlementLogs })));
    const read = await readChainPayments(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sent.map((call: { method: string }) => call.method)).toEqual(["eth_blockNumber", "eth_getLogs"]);
    expect(Number(BigInt(sent[1].params[0].fromBlock))).toBe(OPS_DEPLOYMENTS[421614].MockUSDG.deployBlock);
    expect(sent[1].params[0].address).toEqual([FACILITATOR, TOKEN]);
    expect(read).toMatchObject({ ok: true, range: { fromBlock: OPS_DEPLOYMENTS[421614].MockUSDG.deployBlock, toBlock: HEAD, truncated: false } });
    expect(read.rows).toHaveLength(1);
  });

  it("shrinks the window when the node limits the range and reports the truncation", async () => {
    let logCalls = 0;
    const fetchImpl = rpc((calls) => calls.map((call) => {
      if (call.method === "eth_blockNumber") return { id: call.id, result: `0x${(HEAD + 1_000_000).toString(16)}` };
      logCalls += 1;
      return logCalls < 3
        ? { id: call.id, error: { code: -32000, message: "query exceeds max block range" } }
        : { id: call.id, result: [] };
    }));
    const read = await readChainPayments(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(read).toMatchObject({ ok: true, rows: [], range: { fromBlock: HEAD + 1_000_000 - FALLBACK_WINDOWS[1], truncated: true } });
  });

  it("gives up after the last window with a generic error", async () => {
    const fetchImpl = rpc((calls) => calls.map((call) => (call.method === "eth_blockNumber"
      ? { id: call.id, result: `0x${(HEAD + 1_000_000).toString(16)}` }
      : { id: call.id, error: { code: -32005, message: "limit exceeded: secret-node-7" } })));
    const read = await readChainPayments(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1 + FALLBACK_WINDOWS.length);
    expect(read).toEqual({ ok: false, error: "RPC refused the log range", range: null, rows: [] });
  });

  it("does not retry on an error that is not a range limit", async () => {
    const fetchImpl = rpc((calls) => calls.map((call) => (call.method === "eth_blockNumber" ? { id: call.id, result: "0x10" } : { id: call.id, error: { code: -32603, message: "internal" } })));
    const read = await readChainPayments(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(read).toMatchObject({ ok: false, error: "Log query failed" });
  });

  it("looks up block timestamps in one extra request when logs carry none", async () => {
    const bare = settlementLogs.map((log) => ({ ...log, blockTimestamp: undefined }));
    const fetchImpl = rpc((calls) => calls.map((call) => {
      if (call.method === "eth_blockNumber") return { id: call.id, result: `0x${HEAD.toString(16)}` };
      if (call.method === "eth_getLogs") return { id: call.id, result: bare };
      return { id: call.id, result: { timestamp: "0x6abe7714" } };
    }));
    const read = await readChainPayments(421614, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(read.rows[0].timestamp).toBe(new Date(0x6abe7714 * 1000).toISOString());
  });
});

describe("fetchPayments", () => {
  beforeEach(() => clearOpsCache());

  it("keeps one chain's failure from hiding the other", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("robinhood")) throw new TypeError("fetch failed");
      const calls = JSON.parse(init.body as string) as { id: number; method: string }[];
      return new Response(JSON.stringify(calls.map((call) => ({ id: call.id, result: call.method === "eth_blockNumber" ? `0x${HEAD.toString(16)}` : settlementLogs }))));
    }) as unknown as typeof fetch;
    const snapshot = await fetchPayments({ fetchImpl });
    const [arbitrum, robinhood] = snapshot.chains;
    expect(arbitrum).toMatchObject({ chainId: 421614, ok: true, rowCount: 1, totals: { payments: 1, settled: 1, volume: "0.05", uniquePayers: 1 } });
    expect(arbitrum.lastSettlement?.txHash).toBe(TX);
    expect(robinhood).toMatchObject({ chainId: 46630, ok: false, error: "RPC unavailable", rows: [], lastSettlement: null });
    expect(snapshot.totals).toMatchObject({ payments: 1, volume: "0.05" });
    expect(snapshot.token).toEqual({ symbol: "mUSDG", decimals: 6 });
  });

  it("serves a second call from the per-isolate cache and refetches when fresh", async () => {
    const fetchImpl = rpc((calls) => calls.map((call) => ({ id: call.id, result: call.method === "eth_blockNumber" ? "0x20" : [] })));
    await fetchPayments({ fetchImpl });
    await fetchPayments({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await fetchPayments({ fetchImpl, fresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});
