// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSession } from "@/lib/ops/session";

const loaders = {
  fetchOverview: vi.fn(),
  fetchPayments: vi.fn(),
  fetchContracts: vi.fn(),
  fetchMarketplace: vi.fn(),
  fetchInfra: vi.fn(),
  fetchOpsBalancesCached: vi.fn(),
};

vi.mock("@/lib/ops/overview", () => ({ fetchOverview: loaders.fetchOverview }));
vi.mock("@/lib/ops/payments", () => ({ fetchPayments: loaders.fetchPayments }));
vi.mock("@/lib/ops/contracts", () => ({ fetchContracts: loaders.fetchContracts }));
vi.mock("@/lib/ops/marketplace", () => ({ fetchMarketplace: loaders.fetchMarketplace }));
vi.mock("@/lib/ops/infra", () => ({ fetchInfra: loaders.fetchInfra }));
vi.mock("@/lib/ops/balances", () => ({ fetchOpsBalancesCached: loaders.fetchOpsBalancesCached }));

const SECRET = "x".repeat(40);

const ROUTES = [
  { path: "/api/ops/overview", load: () => import("./overview/route"), loader: loaders.fetchOverview, body: { refreshedAt: "now", checks: [], counts: { ok: 0, warn: 0, bad: 0, unknown: 0 } } },
  { path: "/api/ops/balances", load: () => import("./balances/route"), loader: loaders.fetchOpsBalancesCached, body: { refreshedAt: "now", chains: [], rows: [], warning: null } },
  { path: "/api/ops/payments", load: () => import("./payments/route"), loader: loaders.fetchPayments, body: { refreshedAt: "now", token: { symbol: "mUSDG", decimals: 6 }, chains: [], totals: {} } },
  { path: "/api/ops/contracts", load: () => import("./contracts/route"), loader: loaders.fetchContracts, body: { refreshedAt: "now", settler: "0x0", chains: [] } },
  { path: "/api/ops/marketplace", load: () => import("./marketplace/route"), loader: loaders.fetchMarketplace, body: { refreshedAt: "now", catalog: { state: "ok", datasets: [] }, gear: { total: 0 }, orders: { state: "empty" } } },
  { path: "/api/ops/infra", load: () => import("./infra/route"), loader: loaders.fetchInfra, body: { refreshedAt: "now", rpc: [], config: { items: [], checks: [] } } },
] as const;

function configure() {
  vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "fake-secret");
  vi.stubEnv("OPS_SESSION_SECRET", SECRET);
  vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com");
}

async function session(email = "ottodevs@gmail.com", secret = SECRET) {
  return { cookie: `digi_ops_session=${await sealSession(secret, email)}` };
}

beforeEach(() => {
  for (const loader of Object.values(loaders)) loader.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe.each(ROUTES)("GET $path", ({ path, load, loader, body }) => {
  const url = `http://localhost${path}`;

  it("returns 401 without a session and never loads data", async () => {
    configure();
    const { GET } = await load();
    const response = await GET(new Request(url));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Sign in required." });
    expect(loader).not.toHaveBeenCalled();
  });

  it("returns 401 for a forged session and for an email that is not allowlisted", async () => {
    configure();
    const { GET } = await load();
    expect((await GET(new Request(url, { headers: await session("ottodevs@gmail.com", "y".repeat(40)) }))).status).toBe(401);
    expect((await GET(new Request(url, { headers: await session("intruder@gmail.com") }))).status).toBe(401);
    expect(loader).not.toHaveBeenCalled();
  });

  it("returns 503 and no data when ops is not configured", async () => {
    const { GET } = await load();
    const response = await GET(new Request(url, { headers: await session() }));
    expect(response.status).toBe(503);
    expect(loader).not.toHaveBeenCalled();
  });

  it("returns 200 with the snapshot and no-store headers for a session", async () => {
    configure();
    loader.mockResolvedValue(body);
    const { GET } = await load();
    const response = await GET(new Request(url, { headers: await session() }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(body);
    expect(loader).toHaveBeenCalledWith({ fresh: false });
  });

  it("passes fresh only for ?fresh=1", async () => {
    configure();
    loader.mockResolvedValue(body);
    const { GET } = await load();
    await GET(new Request(`${url}?fresh=1`, { headers: await session() }));
    expect(loader).toHaveBeenLastCalledWith({ fresh: true });
    await GET(new Request(`${url}?fresh=true`, { headers: await session() }));
    expect(loader).toHaveBeenLastCalledWith({ fresh: false });
  });

  it("returns a generic 502 when the loader throws, with no detail in the body", async () => {
    configure();
    loader.mockRejectedValue(new Error("upstream said: token ghp_secret at 10.0.0.4"));
    const { GET } = await load();
    const response = await GET(new Request(url, { headers: await session() }));
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ message: "Data could not be loaded." });
    expect(text).not.toMatch(/ghp_secret|10\.0\.0\.4/);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
