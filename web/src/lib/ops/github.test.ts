// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache } from "./cache";
import { clearGithubFallback, DEFAULT_GITHUB_REPO, fetchCiStatus, GITHUB_TTL_MS, parseWorkflowRuns, pickLatest, readGithubRepo } from "./github";

const run = {
  id: 36891366658,
  name: "CI",
  status: "completed",
  conclusion: "success",
  head_sha: "d362ad3561850360abba2459f4ee38d7b0ddf53d",
  display_title: "Merge pull request #9 from DigiPaga/feat/ops-dashboard",
  event: "push",
  created_at: "2026-10-01T16:21:25Z",
  updated_at: "2026-10-01T16:24:02Z",
  html_url: "https://github.com/DigiPaga/digi-robotics/actions/runs/36891366658",
};

function ok(body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function limited(status = 403) {
  return vi.fn(async () => new Response(JSON.stringify({ message: "API rate limit exceeded for 203.0.113.9." }), {
    status,
    headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790873288" },
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  clearOpsCache();
  clearGithubFallback();
});

describe("readGithubRepo", () => {
  it("defaults to the public repository and accepts a valid override", () => {
    expect(readGithubRepo({})).toBe(DEFAULT_GITHUB_REPO);
    expect(readGithubRepo({ OPS_GITHUB_REPO: "halving-labs/digi-robotics" })).toBe("halving-labs/digi-robotics");
  });

  it.each(["", "no-slash", "a/b/c", "../etc/passwd", "owner/repo?x=1", "owner/repo#frag", "https://github.com/a/b"])("ignores %s", (value) => {
    expect(readGithubRepo({ OPS_GITHUB_REPO: value })).toBe(DEFAULT_GITHUB_REPO);
  });
});

describe("parseWorkflowRuns", () => {
  it("maps the fields the console shows", () => {
    expect(parseWorkflowRuns({ total_count: 1, workflow_runs: [run] }, DEFAULT_GITHUB_REPO)).toEqual([{
      id: run.id, workflow: "CI", status: "completed", conclusion: "success", sha: run.head_sha, title: run.display_title,
      event: "push", createdAt: run.created_at, updatedAt: run.updated_at, url: run.html_url,
    }]);
  });

  it("keeps an in-progress run with a null conclusion", () => {
    const [parsed] = parseWorkflowRuns({ workflow_runs: [{ ...run, status: "in_progress", conclusion: null }] }, DEFAULT_GITHUB_REPO)!;
    expect(parsed).toMatchObject({ status: "in_progress", conclusion: null });
  });

  it("drops malformed runs, caps the list and rejects a foreign link", () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ ...run, id: index }));
    const parsed = parseWorkflowRuns({ workflow_runs: [{ id: "x" }, null, { ...run, id: 99, created_at: "2026-10-02T00:00:00Z", html_url: "https://evil.example/phish" }, ...many] }, DEFAULT_GITHUB_REPO)!;
    expect(parsed).toHaveLength(6);
    expect(parsed[0]).toMatchObject({ id: 99, url: "https://github.com/DigiPaga/digi-robotics/actions" });
  });

  it("orders runs newest first whatever order GitHub sends", () => {
    const older = { ...run, id: 1, created_at: "2026-09-27T15:47:09Z", conclusion: "failure" };
    const newer = { ...run, id: 2, created_at: "2026-10-01T16:21:25Z" };
    expect(parseWorkflowRuns({ workflow_runs: [older, newer] }, DEFAULT_GITHUB_REPO)!.map((item) => item.id)).toEqual([2, 1]);
  });

  it("returns null for a body that is not a runs listing", () => {
    expect(parseWorkflowRuns({ message: "Not Found" }, DEFAULT_GITHUB_REPO)).toBeNull();
    expect(parseWorkflowRuns(null, DEFAULT_GITHUB_REPO)).toBeNull();
  });
});

describe("pickLatest", () => {
  const parsed = (overrides: object[]) => parseWorkflowRuns({ workflow_runs: overrides.map((item, index) => ({ ...run, id: index, ...item })) }, DEFAULT_GITHUB_REPO)!;

  it("lets a failed workflow of the newest commit win over a passed one", () => {
    const runs = parsed([{ name: "CI" }, { name: "Fork tests", conclusion: "failure" }, { name: "Old", head_sha: "c7960afca78c50e6051f05d607a09dc096fc0389", created_at: "2026-09-30T00:00:00Z", conclusion: "failure" }]);
    expect(pickLatest(runs)).toMatchObject({ workflow: "Fork tests", conclusion: "failure" });
  });

  it("ignores failures of older commits and prefers running over passed", () => {
    const runs = parsed([{ name: "CI" }, { name: "Deploy", status: "in_progress", conclusion: null }, { name: "Old", head_sha: "c7960afca78c50e6051f05d607a09dc096fc0389", created_at: "2026-09-30T00:00:00Z", conclusion: "failure" }]);
    expect(pickLatest(runs)).toMatchObject({ workflow: "Deploy", status: "in_progress" });
    expect(pickLatest([])).toBeNull();
  });
});

describe("fetchCiStatus", () => {
  it("asks GitHub for main without credentials", async () => {
    const fetchImpl = ok({ workflow_runs: [run] });
    const status = await fetchCiStatus({ fetchImpl, env: {} });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/DigiPaga/digi-robotics/actions/runs?branch=main&per_page=10");
    expect(Object.keys(init.headers).map((name) => name.toLowerCase())).not.toContain("authorization");
    expect(status).toMatchObject({ state: "ok", repo: DEFAULT_GITHUB_REPO, branch: "main", rateLimitResetAt: null });
    expect(status.latest).toMatchObject({ conclusion: "success", sha: run.head_sha });
  });

  it("reports rate_limited with the reset time and never the upstream message", async () => {
    const status = await fetchCiStatus({ fetchImpl: limited(), env: {} });
    expect(status).toMatchObject({ state: "rate_limited", runs: [], latest: null, fetchedAt: null, rateLimitResetAt: new Date(1790873288000).toISOString() });
    expect(JSON.stringify(status)).not.toContain("203.0.113.9");
  });

  it("treats 429 as a rate limit and a plain 403 as unavailable", async () => {
    expect((await fetchCiStatus({ fetchImpl: limited(429), env: {} })).state).toBe("rate_limited");
    clearOpsCache();
    const forbidden = vi.fn(async () => new Response("{}", { status: 403 })) as unknown as typeof fetch;
    expect((await fetchCiStatus({ fetchImpl: forbidden, env: {} })).state).toBe("unavailable");
  });

  it("falls back to the last good runs, marked stale, when GitHub starts refusing", async () => {
    let clock = 1_000_000;
    const now = () => clock;
    await fetchCiStatus({ fetchImpl: ok({ workflow_runs: [run] }), env: {}, now });
    clock += GITHUB_TTL_MS + 1;
    const status = await fetchCiStatus({ fetchImpl: limited(), env: {}, now });
    expect(status).toMatchObject({ state: "stale", fetchedAt: new Date(1_000_000).toISOString(), rateLimitResetAt: new Date(1790873288000).toISOString() });
    expect(status.latest?.id).toBe(run.id);
  });

  it.each([
    ["a network error", vi.fn(async () => { throw new TypeError("fetch failed"); })],
    ["a 500", vi.fn(async () => new Response("oops", { status: 500 }))],
    ["a non-json body", vi.fn(async () => new Response("<html>", { status: 200 }))],
    ["an unexpected body", vi.fn(async () => new Response(JSON.stringify({ message: "Not Found" }), { status: 200 }))],
  ])("reports unavailable on %s", async (_label, fetchImpl) => {
    expect(await fetchCiStatus({ fetchImpl: fetchImpl as unknown as typeof fetch, env: {} })).toMatchObject({ state: "unavailable", runs: [] });
  });

  it("makes one request per ttl window", async () => {
    let clock = 0;
    const now = () => clock;
    const fetchImpl = ok({ workflow_runs: [run] });
    await fetchCiStatus({ fetchImpl, env: {}, now });
    clock += GITHUB_TTL_MS - 1;
    await fetchCiStatus({ fetchImpl, env: {}, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    clock += 2;
    await fetchCiStatus({ fetchImpl, env: {}, now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
