// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { hexToNumber, MAX_BATCH_CALLS, rpcBatch, type RpcCall } from "./rpc";

const URL = "https://rpc.example.test";
const calls: RpcCall[] = [
  { method: "eth_blockNumber", params: [] },
  { method: "eth_call", params: [{ to: "0x1", data: "0x" }, "latest"] },
  { method: "eth_getLogs", params: [{}] },
];

function respond(body: unknown, init: ResponseInit = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200, ...init })) as unknown as typeof fetch;
}

describe("rpcBatch", () => {
  it("sends every call in one request and maps answers by id, in any order", async () => {
    const fetchImpl = respond([
      { jsonrpc: "2.0", id: 2, result: [] },
      { jsonrpc: "2.0", id: 0, result: "0x10" },
      { jsonrpc: "2.0", id: 1, result: "0xabc" },
    ]);
    const batch = await rpcBatch(URL, calls, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.map((item: { id: number; method: string }) => [item.id, item.method])).toEqual([[0, "eth_blockNumber"], [1, "eth_call"], [2, "eth_getLogs"]]);
    expect(batch.reachable).toBe(true);
    expect(batch.results).toEqual([{ ok: true, result: "0x10" }, { ok: true, result: "0xabc" }, { ok: true, result: [] }]);
  });

  it("isolates a failing call and classifies reverts and range limits", async () => {
    const fetchImpl = respond([
      { jsonrpc: "2.0", id: 0, result: "0x10" },
      { jsonrpc: "2.0", id: 1, error: { code: 3, message: "execution reverted" } },
      { jsonrpc: "2.0", id: 2, error: { code: -32000, message: "eth_getLogs is limited to a 10,000 range" } },
    ]);
    const { results } = await rpcBatch(URL, calls, { fetchImpl });
    expect(results[0]).toEqual({ ok: true, result: "0x10" });
    expect(results[1]).toMatchObject({ ok: false, reason: "reverted" });
    expect(results[2]).toMatchObject({ ok: false, reason: "limit" });
  });

  it("never returns the upstream error text", async () => {
    const fetchImpl = respond([{ jsonrpc: "2.0", id: 0, error: { code: -32603, message: "internal: key sk_live_123 at 10.0.0.4" } }]);
    const batch = await rpcBatch(URL, [calls[0]], { fetchImpl });
    expect(JSON.stringify(batch)).not.toMatch(/sk_live|10\.0\.0\.4/);
    expect(batch.results[0]).toEqual({ ok: false, reason: "error", code: -32603 });
  });

  it.each([
    ["a network error", vi.fn(async () => { throw new TypeError("fetch failed"); }), "unavailable"],
    ["a timeout", vi.fn(async () => { throw Object.assign(new Error("timed out"), { name: "TimeoutError" }); }), "timeout"],
    ["an http error", vi.fn(async () => new Response("nope", { status: 502 })), "unavailable"],
    ["a non-json body", vi.fn(async () => new Response("<html>", { status: 200 })), "unavailable"],
    ["a single error object instead of an array", vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "batch too large" } }))), "unavailable"],
  ])("marks every call failed on %s without throwing", async (_label, fetchImpl, reason) => {
    const batch = await rpcBatch(URL, calls, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(batch.reachable).toBe(false);
    expect(batch.results).toHaveLength(3);
    for (const result of batch.results) expect(result).toMatchObject({ ok: false, reason });
  });

  it("marks a call the node did not answer as unavailable", async () => {
    const { results } = await rpcBatch(URL, calls, { fetchImpl: respond([{ jsonrpc: "2.0", id: 0, result: "0x1" }]) });
    expect(results.map((result) => result.ok)).toEqual([true, false, false]);
  });

  it("makes no request for an empty batch and refuses an oversized one", async () => {
    const fetchImpl = respond([]);
    expect((await rpcBatch(URL, [], { fetchImpl })).results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(rpcBatch(URL, Array.from({ length: MAX_BATCH_CALLS + 1 }, () => calls[0]), { fetchImpl })).rejects.toThrow(/cap/);
  });

  it("measures the request with the injected clock", async () => {
    const ticks = [100, 142];
    const batch = await rpcBatch(URL, [calls[0]], { fetchImpl: respond([{ id: 0, result: "0x1" }]), now: () => ticks.shift() ?? 142 });
    expect(batch.latencyMs).toBe(42);
  });
});

describe("hexToNumber", () => {
  it("parses quantities and rejects anything else", () => {
    expect(hexToNumber("0x12c1d658")).toBe(314693208);
    expect(hexToNumber("0x")).toBeNull();
    expect(hexToNumber("12")).toBeNull();
    expect(hexToNumber(null)).toBeNull();
  });
});
