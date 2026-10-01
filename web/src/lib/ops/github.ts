import "server-only";

import { z } from "zod";
import { memo } from "./cache";

type Env = Record<string, string | undefined>;

export const DEFAULT_GITHUB_REPO = "DigiPaga/digi-robotics";

/**
 * ok: fresh answer. stale: GitHub refused (rate limit or outage) and the last
 * good answer of this process is shown instead. rate_limited / unavailable:
 * nothing to show.
 */
export type CiState = "ok" | "stale" | "rate_limited" | "unavailable";

export interface CiRun {
  id: number;
  workflow: string;
  /** queued | in_progress | completed, as GitHub reports it. */
  status: string;
  /** success | failure | cancelled | ... Null while the run is not completed. */
  conclusion: string | null;
  sha: string;
  title: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface CiStatus {
  state: CiState;
  repo: string;
  branch: string;
  /** Newest first. */
  runs: CiRun[];
  /** Newest run of the newest commit that has runs. */
  latest: CiRun | null;
  /** When `runs` was fetched from GitHub. */
  fetchedAt: string | null;
  /** When the unauthenticated quota resets, if GitHub said so. */
  rateLimitResetAt: string | null;
}

export interface GithubOptions {
  fetchImpl?: typeof fetch;
  env?: Env;
  now?: () => number;
}

/**
 * The unauthenticated GitHub API allows 60 requests per hour per IP. One
 * request per TTL keeps a single process at 30 per hour at most. The operator's
 * Refresh button does not bypass this cache.
 */
export const GITHUB_TTL_MS = 120_000;
const TIMEOUT_MS = 5_000;
const MAX_RUNS = 6;
/**
 * Asked for more than is shown. Observed on 2026-10-01: the same query with
 * per_page=6 answered from an older index (runs four days stale) while
 * per_page=10 was current, so the page size is not tuned down to MAX_RUNS.
 */
const PAGE_SIZE = 10;
const BRANCH = "main";

const runSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  conclusion: z.string().nullable().optional(),
  head_sha: z.string(),
  display_title: z.string().nullable().optional(),
  event: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  html_url: z.string(),
});

const responseSchema = z.object({ workflow_runs: z.array(z.unknown()) });

const lastGood = new Map<string, { runs: CiRun[]; fetchedAt: string }>();

export function readGithubRepo(env: Env = process.env): string {
  const raw = env.OPS_GITHUB_REPO?.trim();
  return raw && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(raw) ? raw : DEFAULT_GITHUB_REPO;
}

function severity(run: CiRun): number {
  if (run.status !== "completed") return 1;
  return run.conclusion === "success" || run.conclusion === "skipped" || run.conclusion === "neutral" ? 0 : 2;
}

/**
 * The run that stands for "CI on main": among the runs of the newest commit
 * (several workflows can run on one push), a failed one wins over a running
 * one, which wins over a passed one. `runs` is newest first.
 */
export function pickLatest(runs: readonly CiRun[]): CiRun | null {
  const head = runs[0];
  if (!head) return null;
  return runs.filter((run) => run.sha === head.sha).reduce((worst, run) => (severity(run) > severity(worst) ? run : worst), head);
}

/** Pure: GitHub's `actions/runs` body to our rows. Anything that does not parse is dropped. */
export function parseWorkflowRuns(body: unknown, repo: string): CiRun[] | null {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return null;
  const runs: CiRun[] = [];
  for (const item of parsed.data.workflow_runs) {
    const run = runSchema.safeParse(item);
    if (!run.success) continue;
    // Only link to the repository we asked about, whatever the body says.
    const url = run.data.html_url.startsWith(`https://github.com/${repo}/`) ? run.data.html_url : `https://github.com/${repo}/actions`;
    runs.push({
      id: run.data.id,
      workflow: (run.data.name ?? "workflow").slice(0, 80),
      status: (run.data.status ?? "unknown").slice(0, 30),
      conclusion: run.data.conclusion ? run.data.conclusion.slice(0, 30) : null,
      sha: run.data.head_sha.slice(0, 40),
      title: (run.data.display_title ?? "").slice(0, 140),
      event: (run.data.event ?? "").slice(0, 30),
      createdAt: run.data.created_at,
      updatedAt: run.data.updated_at,
      url,
    });
  }
  // GitHub documents newest first; sort anyway so `latest` never depends on it.
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return runs.slice(0, MAX_RUNS);
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  return response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
}

function resetTime(response: Response): string | null {
  const seconds = Number(response.headers.get("x-ratelimit-reset"));
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

async function load(repo: string, options: GithubOptions): Promise<CiStatus> {
  const now = options.now ?? Date.now;
  const base = { repo, branch: BRANCH };
  const fallback = (state: "rate_limited" | "unavailable", rateLimitResetAt: string | null): CiStatus => {
    const good = lastGood.get(repo);
    return good
      ? { ...base, state: "stale", runs: good.runs, latest: pickLatest(good.runs), fetchedAt: good.fetchedAt, rateLimitResetAt }
      : { ...base, state, runs: [], latest: null, fetchedAt: null, rateLimitResetAt };
  };
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`https://api.github.com/repos/${repo}/actions/runs?branch=${BRANCH}&per_page=${PAGE_SIZE}`, {
      // No Authorization header: the repository is public and no token is configured.
      headers: { accept: "application/vnd.github+json", "user-agent": "digirobotics-ops", "x-github-api-version": "2022-11-28" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return fallback("unavailable", null);
  }
  if (isRateLimited(response)) return fallback("rate_limited", resetTime(response));
  if (!response.ok) return fallback("unavailable", null);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallback("unavailable", null);
  }
  const runs = parseWorkflowRuns(body, repo);
  if (!runs) return fallback("unavailable", null);
  const fetchedAt = new Date(now()).toISOString();
  lastGood.set(repo, { runs, fetchedAt });
  return { ...base, state: "ok", runs, latest: pickLatest(runs), fetchedAt, rateLimitResetAt: null };
}

/** Latest GitHub Actions runs on main. One request per GITHUB_TTL_MS at most. Never throws. */
export async function fetchCiStatus(options: GithubOptions = {}): Promise<CiStatus> {
  const repo = readGithubRepo(options.env);
  return memo(`github:${repo}`, GITHUB_TTL_MS, () => load(repo, options), { now: options.now });
}

/** Test hook. */
export function clearGithubFallback(): void {
  lastGood.clear();
}
