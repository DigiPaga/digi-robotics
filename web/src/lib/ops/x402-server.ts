import "server-only";

import { z } from "zod";
import { memo } from "./cache";

type Env = Record<string, string | undefined>;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  env?: Env;
  now?: () => number;
  fresh?: boolean;
}

export type X402State = "ok" | "unconfigured" | "unreachable" | "invalid";

export interface X402Health {
  state: X402State;
  /** Origin only, never a path or credentials. Null when not configured. */
  origin: string | null;
  mode: string | null;
  latencyMs: number | null;
  /** HTTP status of /health when the server answered. */
  httpStatus: number | null;
}

export interface X402Dataset {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priceDisplay: string;
  network: string;
  assetSymbol: string;
  assetAddress: string;
  sellerAddress: string;
}

export interface X402Catalog {
  state: X402State;
  origin: string | null;
  datasets: X402Dataset[];
}

const TIMEOUT_MS = 4_000;
const HEALTH_TTL_MS = 10_000;
const CATALOG_TTL_MS = 30_000;
export const MAX_DATASETS = 50;

/**
 * The x402 server base URL: X402_SERVER_URL, or the URL the public agent demo
 * already uses. http(s) only, and any embedded credentials make it invalid.
 */
export function readX402ServerUrl(env: Env = process.env): URL | null {
  const raw = env.X402_SERVER_URL?.trim() || env.NEXT_PUBLIC_X402_BACKEND_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function endpoint(base: URL, path: string): string {
  return new URL(path, `${base.origin}${base.pathname.replace(/\/+$/, "")}/`).toString();
}

const healthSchema = z.object({ status: z.string().max(40), mode: z.string().max(60).optional() });

const text = (max: number) => z.string().transform((value) => value.slice(0, max));

const datasetSchema = z.object({
  id: text(80),
  title: text(120),
  description: text(400).default(""),
  tags: z.array(text(40)).max(12).default([]),
  priceDisplay: text(40).default(""),
  network: text(40).default(""),
  assetSymbol: text(20).default(""),
  assetAddress: text(64).default(""),
  sellerAddress: text(64).default(""),
});

const catalogSchema = z.object({ datasets: z.array(z.unknown()).max(500) });

async function getJson(url: string, fetchImpl: typeof fetch): Promise<{ status: number; body: unknown } | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      redirect: "error",
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Not JSON: reported as invalid by the caller.
    }
    return { status: response.status, body };
  } catch {
    return null;
  }
}

/** GET <server>/health. One request. Never throws. */
export async function fetchX402Health(options: FetchOptions = {}): Promise<X402Health> {
  const base = readX402ServerUrl(options.env);
  if (!base) return { state: "unconfigured", origin: null, mode: null, latencyMs: null, httpStatus: null };
  return memo(`x402-health:${base.href}`, HEALTH_TTL_MS, async (): Promise<X402Health> => {
    const now = options.now ?? Date.now;
    const started = now();
    const answer = await getJson(endpoint(base, "health"), options.fetchImpl ?? fetch);
    const latencyMs = now() - started;
    if (!answer) return { state: "unreachable", origin: base.origin, mode: null, latencyMs: null, httpStatus: null };
    const parsed = healthSchema.safeParse(answer.body);
    if (answer.status !== 200 || !parsed.success || parsed.data.status !== "ok") {
      return { state: "invalid", origin: base.origin, mode: null, latencyMs, httpStatus: answer.status };
    }
    return { state: "ok", origin: base.origin, mode: parsed.data.mode ?? null, latencyMs, httpStatus: 200 };
  }, { fresh: options.fresh, now: options.now });
}

/** GET <server>/agent-demo/catalog. One request. Never throws. Entries that do not parse are dropped. */
export async function fetchX402Catalog(options: FetchOptions = {}): Promise<X402Catalog> {
  const base = readX402ServerUrl(options.env);
  if (!base) return { state: "unconfigured", origin: null, datasets: [] };
  return memo(`x402-catalog:${base.href}`, CATALOG_TTL_MS, async (): Promise<X402Catalog> => {
    const answer = await getJson(endpoint(base, "agent-demo/catalog"), options.fetchImpl ?? fetch);
    if (!answer) return { state: "unreachable", origin: base.origin, datasets: [] };
    const parsed = catalogSchema.safeParse(answer.body);
    if (answer.status !== 200 || !parsed.success) return { state: "invalid", origin: base.origin, datasets: [] };
    const datasets: X402Dataset[] = [];
    for (const item of parsed.data.datasets) {
      const dataset = datasetSchema.safeParse(item);
      if (dataset.success) datasets.push(dataset.data);
      if (datasets.length >= MAX_DATASETS) break;
    }
    return { state: "ok", origin: base.origin, datasets };
  }, { fresh: options.fresh, now: options.now });
}
