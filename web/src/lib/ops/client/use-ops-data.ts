"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * A small stale-while-revalidate cache for the ops data endpoints. It lives in
 * module scope, so it survives client-side navigation between sections: a
 * section that was seen before paints from memory and then revalidates in the
 * background. Nothing is written to storage, and a 401 empties it.
 *
 * In-repo on purpose: this is the whole feature set the console needs, and a
 * data-fetching dependency would add more code to the bundle than this file.
 */
export interface OpsDataState<T> {
  data: T | undefined;
  /** Generic message. Stale data, when there is any, stays visible next to it. */
  error: string | null;
  /** Epoch milliseconds of the last successful load. */
  updatedAt: number | null;
  validating: boolean;
}

export interface OpsDataResult<T> extends OpsDataState<T> {
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** Reloads past the server's short cache. */
  refresh: () => Promise<void>;
}

export interface UseOpsDataOptions {
  /** Revalidate on this interval while the tab is visible. */
  refreshInterval?: number;
}

/** A mounted section does not refetch data younger than this. */
export const DEDUPE_MS = 2_000;
/** Returning to the tab revalidates data older than this. */
export const FOCUS_STALE_MS = 10_000;

const EMPTY: OpsDataState<never> = { data: undefined, error: null, updatedAt: null, validating: false };

const states = new Map<string, OpsDataState<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();
let onUnauthorized: (() => void) | null = null;
let generation = 0;

function read<T>(url: string): OpsDataState<T> {
  return (states.get(url) as OpsDataState<T> | undefined) ?? EMPTY;
}

function write(url: string, patch: Partial<OpsDataState<unknown>>): void {
  states.set(url, { ...read(url), ...patch });
  listeners.get(url)?.forEach((listener) => listener());
}

function subscribe(url: string, listener: () => void): () => void {
  let set = listeners.get(url);
  if (!set) listeners.set(url, (set = new Set()));
  set.add(listener);
  return () => { set.delete(listener); };
}

/** The shell registers what a 401 should do (re-render the server layout, which shows sign-in). */
export function setOpsUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Drops everything, including loads still in flight. Called on 401 and by tests. */
export function clearOpsDataCache(): void {
  generation += 1;
  inflight.clear();
  const urls = [...states.keys()];
  states.clear();
  for (const url of urls) listeners.get(url)?.forEach((listener) => listener());
}

/**
 * Loads `url` into the cache. Concurrent callers share one request.
 * `fresh` adds ?fresh=1 so the server skips its own short cache.
 */
export function revalidateOpsData(url: string, options: { fresh?: boolean } = {}): Promise<void> {
  const pending = inflight.get(url);
  if (pending && !options.fresh) return pending;
  const startedIn = generation;
  write(url, { validating: true });
  const run = async (): Promise<void> => {
    try {
      const response = await fetch(options.fresh ? `${url}?fresh=1` : url, { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } });
      if (startedIn !== generation) return;
      if (response.status === 401) {
        clearOpsDataCache();
        onUnauthorized?.();
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (startedIn !== generation) return;
      write(url, { data, error: null, updatedAt: Date.now(), validating: false });
    } catch {
      if (startedIn !== generation) return;
      write(url, { error: "Could not load this section.", validating: false });
    }
  };
  const task: Promise<void> = run().finally(() => {
    if (inflight.get(url) === task) inflight.delete(url);
  });
  inflight.set(url, task);
  return task;
}

/** Warms the cache for a section the operator has not opened yet. No-op when data is already there. */
export function prefetchOpsData(url: string): Promise<void> {
  if (read(url).data !== undefined || inflight.has(url)) return inflight.get(url) ?? Promise.resolve();
  return revalidateOpsData(url);
}

function age(url: string): number {
  const { updatedAt } = read(url);
  return updatedAt === null ? Number.POSITIVE_INFINITY : Date.now() - updatedAt;
}

export function useOpsData<T>(url: string, options: UseOpsDataOptions = {}): OpsDataResult<T> {
  const state = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(url, listener), [url]),
    () => read<T>(url),
    () => EMPTY as OpsDataState<T>,
  );
  const { refreshInterval } = options;

  useEffect(() => {
    if (age(url) > DEDUPE_MS) void revalidateOpsData(url);
    const onVisible = () => {
      if (document.visibilityState === "visible" && age(url) > FOCUS_STALE_MS) void revalidateOpsData(url);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = refreshInterval
      ? window.setInterval(() => { if (document.visibilityState === "visible") void revalidateOpsData(url); }, refreshInterval)
      : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [url, refreshInterval]);

  const refresh = useCallback(() => revalidateOpsData(url, { fresh: true }), [url]);
  return { ...state, loading: state.data === undefined && state.error === null, refresh };
}
