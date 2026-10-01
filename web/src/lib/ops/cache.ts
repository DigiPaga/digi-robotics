import "server-only";

interface Entry {
  expires: number;
  value: unknown;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Hard cap so a bug in key construction cannot grow the map without bound. */
const MAX_ENTRIES = 64;

export interface MemoOptions {
  /** Skip a cached value (the operator pressed Refresh). Still joins a load already in flight. */
  fresh?: boolean;
  now?: () => number;
}

/**
 * Short-lived cache in module scope, so it lives per server process or per
 * Worker isolate and is never shared between deployments. It only smooths
 * bursts (several sections asking for the same upstream within seconds) and
 * keeps one section load well under the Workers subrequest limit. Responses to
 * the browser stay `Cache-Control: no-store`.
 *
 * Rejections are not cached. Concurrent callers share one load.
 */
export async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>, options: MemoOptions = {}): Promise<T> {
  const now = options.now ?? Date.now;
  if (!options.fresh) {
    const hit = store.get(key);
    if (hit && hit.expires > now()) return hit.value as T;
  }
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const task = (async () => {
    try {
      const value = await load();
      if (store.size >= MAX_ENTRIES && !store.has(key)) store.delete(store.keys().next().value as string);
      store.set(key, { expires: now() + ttlMs, value });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

/** Test hook. */
export function clearOpsCache(): void {
  store.clear();
  inflight.clear();
}
