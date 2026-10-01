import "server-only";

import type { Chain } from "viem";

export interface RpcCall {
  method: string;
  params: readonly unknown[];
}

export type RpcFailure = "unavailable" | "timeout" | "reverted" | "limit" | "error";

export type RpcResult =
  | { ok: true; result: unknown }
  | { ok: false; reason: RpcFailure; code: number | null };

export interface RpcBatch {
  results: RpcResult[];
  /** Wall time of the single HTTP request, in milliseconds. */
  latencyMs: number;
  /** False when the whole request failed (network, timeout, non-JSON body). */
  reachable: boolean;
}

export interface RpcOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export const RPC_TIMEOUT_MS = 8_000;

/** Most calls one batch may carry. Public RPCs reject very large batches. */
export const MAX_BATCH_CALLS = 40;

const LIMIT_PATTERN = /range|too many|limit|exceed|more than|too large|response size|query returned/i;

/** Upstream error text never leaves the server; it is reduced to a small enum. */
function classify(error: { code?: unknown; message?: unknown } | null | undefined): RpcResult {
  const code = typeof error?.code === "number" ? error.code : null;
  const message = typeof error?.message === "string" ? error.message : "";
  if (code === 3 || /revert/i.test(message)) return { ok: false, reason: "reverted", code };
  if (code === -32005 || LIMIT_PATTERN.test(message)) return { ok: false, reason: "limit", code };
  return { ok: false, reason: "error", code };
}

export function rpcUrl(chain: Chain): string {
  return chain.rpcUrls.default.http[0];
}

/**
 * One JSON-RPC batch: exactly one HTTP request (one Workers subrequest) for any
 * number of calls up to MAX_BATCH_CALLS. Never throws. A failed request marks
 * every call unavailable; a failed call inside a good batch fails alone.
 */
export async function rpcBatch(url: string, calls: readonly RpcCall[], options: RpcOptions = {}): Promise<RpcBatch> {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  if (calls.length === 0) return { results: [], latencyMs: 0, reachable: true };
  if (calls.length > MAX_BATCH_CALLS) throw new Error(`rpcBatch: ${calls.length} calls exceed the cap of ${MAX_BATCH_CALLS}`);
  const started = now();
  const failAll = (reason: RpcFailure): RpcBatch => ({
    results: calls.map(() => ({ ok: false, reason, code: null })),
    latencyMs: now() - started,
    reachable: false,
  });
  let payload: unknown;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(calls.map((call, id) => ({ jsonrpc: "2.0", id, method: call.method, params: call.params }))),
      signal: AbortSignal.timeout(options.timeoutMs ?? RPC_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return failAll("unavailable");
    payload = await response.json();
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    return failAll(name === "TimeoutError" || name === "AbortError" ? "timeout" : "unavailable");
  }
  // Some nodes answer a batch they refuse with one error object instead of an array.
  if (!Array.isArray(payload)) return failAll("unavailable");
  const byId = new Map<number, { result?: unknown; error?: { code?: unknown; message?: unknown } }>();
  for (const item of payload) {
    if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "number") byId.set((item as { id: number }).id, item);
  }
  const results = calls.map((_, id): RpcResult => {
    const item = byId.get(id);
    if (!item) return { ok: false, reason: "unavailable", code: null };
    if (item.error) return classify(item.error);
    return { ok: true, result: item.result };
  });
  return { results, latencyMs: now() - started, reachable: true };
}

export function hexToNumber(value: unknown): number | null {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) return null;
  const parsed = Number(BigInt(value));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function toHex(value: number | bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

export function ethCall(to: string, data: string): RpcCall {
  return { method: "eth_call", params: [{ to, data }, "latest"] };
}
