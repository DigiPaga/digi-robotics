// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSession } from "@/lib/ops/session";

const fetchOpsBalances = vi.fn();
vi.mock("@/lib/ops/balances", () => ({ fetchOpsBalances }));

const SECRET = "x".repeat(40);

function configure() {
  vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "fake-secret");
  vi.stubEnv("OPS_SESSION_SECRET", SECRET);
  vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com");
}

beforeEach(() => {
  fetchOpsBalances.mockReset();
  fetchOpsBalances.mockResolvedValue({ refreshedAt: "now", chains: [], rows: [], warning: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/ops/balances", () => {
  it("returns 401 without a session and never reads balances", async () => {
    configure();
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/ops/balances"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(fetchOpsBalances).not.toHaveBeenCalled();
  });

  it("returns 401 for a forged or foreign-secret session cookie", async () => {
    configure();
    const { GET } = await import("./route");
    const foreign = await sealSession("y".repeat(40), "ottodevs@gmail.com");
    const response = await GET(new Request("http://localhost/api/ops/balances", { headers: { cookie: `digi_ops_session=${foreign}` } }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for a valid session whose email is not allowlisted", async () => {
    configure();
    const { GET } = await import("./route");
    const token = await sealSession(SECRET, "intruder@gmail.com");
    const response = await GET(new Request("http://localhost/api/ops/balances", { headers: { cookie: `digi_ops_session=${token}` } }));
    expect(response.status).toBe(401);
  });

  it("only accepts the __Host- session cookie on an https deployment", async () => {
    configure();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPS_BASE_URL", "https://ops.example.test");
    const { GET } = await import("./route");
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const get = (cookie: string) => GET(new Request("http://localhost/api/ops/balances", { headers: { host: "localhost", cookie } }));
    // The unprefixed name could be planted from a sibling subdomain or over http.
    expect((await get(`digi_ops_session=${token}`)).status).toBe(401);
    expect((await get(`__Secure-digi_ops_session=${token}`)).status).toBe(401);
    expect((await get(`__Host-digi_ops_session=${token}`)).status).toBe(200);
  });

  it("returns 503 and no data when ops is not configured", async () => {
    const { GET } = await import("./route");
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const response = await GET(new Request("http://localhost/api/ops/balances", { headers: { cookie: `digi_ops_session=${token}` } }));
    expect(response.status).toBe(503);
    expect(fetchOpsBalances).not.toHaveBeenCalled();
  });

  it("returns balances for an allowlisted session", async () => {
    configure();
    const { GET } = await import("./route");
    const token = await sealSession(SECRET, "otto.devs@gmail.com");
    const response = await GET(new Request("http://localhost/api/ops/balances", { headers: { cookie: `digi_ops_session=${token}` } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ rows: [] });
  });
});
