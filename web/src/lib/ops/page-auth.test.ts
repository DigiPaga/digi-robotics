// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn<(name: string) => { value: string } | undefined>(() => undefined);
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));

afterEach(() => {
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
});
