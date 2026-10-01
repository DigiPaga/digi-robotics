import { describe, expect, it } from "vitest";
import { cookieSecure, devRequestOrigin, isProduction, publicOrigin, readOpsConfig, redirectUri } from "./config";

const full = {
  GOOGLE_CLIENT_ID: "cid",
  GOOGLE_CLIENT_SECRET: "csecret",
  OPS_SESSION_SECRET: "s".repeat(32),
  OPS_ALLOWED_EMAILS: "ottodevs@gmail.com",
};

describe("readOpsConfig", () => {
  it("fails closed when any required variable is missing", () => {
    expect(readOpsConfig({})).toMatchObject({ ok: false });
    for (const name of Object.keys(full)) {
      const result = readOpsConfig({ ...full, [name]: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.problems.join(" ")).toContain(name);
    }
  });

  it("rejects a short session secret, an empty allowlist and an http base URL", () => {
    expect(readOpsConfig({ ...full, OPS_SESSION_SECRET: "short" }).ok).toBe(false);
    expect(readOpsConfig({ ...full, OPS_ALLOWED_EMAILS: "nope" }).ok).toBe(false);
    expect(readOpsConfig({ ...full, OPS_BASE_URL: "http://ops.example.com" }).ok).toBe(false);
    expect(readOpsConfig({ ...full, OPS_BASE_URL: "not a url" }).ok).toBe(false);
  });

  it("accepts a complete config and derives the redirect URI", () => {
    const result = readOpsConfig({ ...full, OPS_BASE_URL: "https://digirobotics.xyz/" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(redirectUri(result.config, "http://10.0.0.1:3000/ops/login", "internal:3000")).toBe("https://digirobotics.xyz/ops/callback");
    const noBase = readOpsConfig(full);
    if (!noBase.ok) throw new Error("expected ok");
    expect(redirectUri(noBase.config, "http://localhost:46200/ops/login", "localhost:46200")).toBe("http://localhost:46200/ops/callback");
    expect(redirectUri(noBase.config, "http://127.0.0.1:46121/ops/login", "digirobotics.test")).toBe("https://digirobotics.test/ops/callback");
  });

  it("requires OPS_BASE_URL in production and nowhere else", () => {
    const production = readOpsConfig({ ...full, NODE_ENV: "production" });
    expect(production.ok).toBe(false);
    if (!production.ok) expect(production.problems).toContain("OPS_BASE_URL is required in production");
    expect(readOpsConfig({ ...full, NODE_ENV: "production", OPS_BASE_URL: "  " }).ok).toBe(false);
    expect(readOpsConfig({ ...full, NODE_ENV: "production", OPS_BASE_URL: "https://digirobotics.xyz" }).ok).toBe(true);
    expect(readOpsConfig({ ...full, NODE_ENV: "development" }).ok).toBe(true);
    expect(readOpsConfig({ ...full, NODE_ENV: "test" }).ok).toBe(true);
    expect(isProduction({ NODE_ENV: "production" })).toBe(true);
    expect(isProduction({})).toBe(false);
  });

  it("never derives an origin from the Host header in production", () => {
    const production = { NODE_ENV: "production" };
    expect(devRequestOrigin("http://127.0.0.1:3000/ops/login", "evil.example", production)).toBeNull();
    expect(devRequestOrigin("http://127.0.0.1:3000/ops/login", "digirobotics.test", { NODE_ENV: "development" })).toBe("https://digirobotics.test");
    const withBase = readOpsConfig({ ...full, ...production, OPS_BASE_URL: "https://digirobotics.xyz" });
    if (!withBase.ok) throw new Error("expected ok");
    expect(redirectUri(withBase.config, "http://127.0.0.1:3000/ops/login", "evil.example", production)).toBe("https://digirobotics.xyz/ops/callback");
    const noBase = readOpsConfig(full);
    if (!noBase.ok) throw new Error("expected ok");
    expect(() => redirectUri(noBase.config, "http://127.0.0.1:3000/ops/login", "evil.example", production)).toThrow("OPS_BASE_URL");
  });

  it("marks cookies Secure except on plain-http loopback", () => {
    expect(cookieSecure("http://localhost:46200/ops", "localhost:46200")).toBe(false);
    expect(cookieSecure("http://127.0.0.1:46200/ops")).toBe(false);
    expect(cookieSecure("http://127.0.0.1:46121/ops", "digirobotics.test")).toBe(true);
    expect(cookieSecure("https://localhost/ops")).toBe(true);
    expect(publicOrigin("http://127.0.0.1:1/ops", "ops.example.com")).toBe("https://ops.example.com");
  });
});
