// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn<(name: string) => { value: string } | undefined>(() => undefined);
const requestHeaders = new Headers();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }), headers: async () => requestHeaders }));

afterEach(() => {
  cookieGet.mockReset();
  requestHeaders.delete("host");
  requestHeaders.delete("x-forwarded-proto");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("getOpsPageState", () => {
  it("reports config problems to the server log only, once per distinct list", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getOpsPageState } = await import("./page-auth");
    const state = await getOpsPageState();
    expect(state).toEqual({ kind: "unconfigured" });
    expect(JSON.stringify(state)).not.toMatch(/GOOGLE_|OPS_/);
    await getOpsPageState();
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain("GOOGLE_CLIENT_ID is not set");

    vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
    await getOpsPageState();
    expect(log).toHaveBeenCalledTimes(2);
    expect(String(log.mock.calls[1][0])).not.toContain("GOOGLE_CLIENT_ID");
  });

  it("is signed-out, and silent, when configured and no session cookie is present", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "fake-secret");
    vi.stubEnv("OPS_SESSION_SECRET", "p".repeat(40));
    vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com");
    const { getOpsPageState } = await import("./page-auth");
    expect(await getOpsPageState()).toEqual({ kind: "signed-out" });
    expect(log).not.toHaveBeenCalled();
  });

  async function stateFor(cookieName: string, host: string, extraEnv: Record<string, string> = {}) {
    vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "fake-secret");
    vi.stubEnv("OPS_SESSION_SECRET", "p".repeat(40));
    vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com");
    for (const [name, value] of Object.entries(extraEnv)) vi.stubEnv(name, value);
    const { sealSession } = await import("./session");
    const token = await sealSession("p".repeat(40), "ottodevs@gmail.com");
    cookieGet.mockImplementation((name) => (name === cookieName ? { value: token } : undefined));
    requestHeaders.set("host", host);
    const { getOpsPageState } = await import("./page-auth");
    return (await getOpsPageState()).kind;
  }

  it("reads the plain session cookie on http localhost", async () => {
    expect(await stateFor("digi_ops_session", "localhost:46121")).toBe("signed-in");
  });

  it("reads only the __Host- session cookie behind a public host", async () => {
    expect(await stateFor("__Host-digi_ops_session", "digirobotics.test")).toBe("signed-in");
    expect(await stateFor("digi_ops_session", "digirobotics.test")).toBe("signed-out");
  });

  it("ignores a spoofed loopback Host in production", async () => {
    const production = { NODE_ENV: "production", OPS_BASE_URL: "https://ops.example.test" };
    expect(await stateFor("digi_ops_session", "localhost:3000", production)).toBe("signed-out");
    expect(await stateFor("__Host-digi_ops_session", "localhost:3000", production)).toBe("signed-in");
  });
});
