// @vitest-environment node
import { describe, expect, it } from "vitest";
import { b64url, b64urlDecode, seal } from "./crypto";
import {
  newOauthState,
  openOauthState,
  openSession,
  OAUTH_MAX_AGE,
  readCookie,
  sealOauthState,
  sealSession,
  SESSION_MAX_AGE,
  sessionFromCookieValue,
} from "./session";
import { parseAllowlist } from "./allowlist";
import type { OpsConfig } from "./config";

const SECRET = "a".repeat(48);
const NOW = 1_800_000_000;

function tamperPayload(token: string, mutate: (data: Record<string, unknown>) => void): string {
  const [payload, mac] = token.split(".");
  const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)!)) as Record<string, unknown>;
  mutate(data);
  return `${b64url(new TextEncoder().encode(JSON.stringify(data)))}.${mac}`;
}

describe("ops session cookie", () => {
  it("round-trips a sealed session with a 12h expiry and a csrf token", async () => {
    const token = await sealSession(SECRET, "ottodevs@gmail.com", NOW);
    const session = await openSession(SECRET, token, NOW + 60);
    expect(session).toMatchObject({ email: "ottodevs@gmail.com", exp: NOW + SESSION_MAX_AGE });
    expect(session?.csrf.length).toBeGreaterThanOrEqual(20);
    expect(SESSION_MAX_AGE).toBe(12 * 60 * 60);
  });

  it("rejects a tampered payload, a tampered mac and a different secret", async () => {
    const token = await sealSession(SECRET, "ottodevs@gmail.com", NOW);
    const forged = tamperPayload(token, (data) => { data.email = "attacker@example.com"; });
    expect(await openSession(SECRET, forged, NOW)).toBeNull();
    const badMac = `${token.slice(0, -2)}${token.endsWith("AA") ? "BB" : "AA"}`;
    expect(await openSession(SECRET, badMac, NOW)).toBeNull();
    expect(await openSession("b".repeat(48), token, NOW)).toBeNull();
  });

  it("rejects expired sessions and garbage", async () => {
    const token = await sealSession(SECRET, "ottodevs@gmail.com", NOW);
    expect(await openSession(SECRET, token, NOW + SESSION_MAX_AGE)).toBeNull();
    expect(await openSession(SECRET, token, NOW + SESSION_MAX_AGE + 1)).toBeNull();
    for (const raw of ["", "nodot", ".mac", "a.b.c", "!!!.???", undefined, null]) {
      expect(await openSession(SECRET, raw, NOW)).toBeNull();
    }
  });

  it("rejects a correctly signed payload with the wrong shape", async () => {
    const token = await seal(SECRET, { email: 42, csrf: "x", exp: NOW + 100 });
    expect(await openSession(SECRET, token, NOW)).toBeNull();
  });

  it("drops a valid session once the email leaves the allowlist", async () => {
    const config: OpsConfig = { clientId: "c", clientSecret: "s", sessionSecret: SECRET, allowlist: parseAllowlist("ottodevs@gmail.com"), baseUrl: null };
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    expect(await sessionFromCookieValue(config, token)).not.toBeNull();
    expect(await sessionFromCookieValue({ ...config, allowlist: parseAllowlist("someone@else.com") }, token)).toBeNull();
    expect(await sessionFromCookieValue({ ...config, allowlist: parseAllowlist("") }, token)).toBeNull();
  });
});

describe("ops OAuth state cookie", () => {
  it("generates distinct high-entropy state, nonce and PKCE verifier", () => {
    const a = newOauthState();
    const b = newOauthState();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(a.state);
    // RFC 7636: verifier is 43-128 chars from the unreserved set.
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(a.state.length).toBeGreaterThanOrEqual(43);
  });

  it("round-trips and expires after 10 minutes", async () => {
    const state = newOauthState();
    const token = await sealOauthState(SECRET, state, NOW);
    expect(await openOauthState(SECRET, token, NOW + 1)).toEqual({ ...state, exp: NOW + OAUTH_MAX_AGE });
    expect(await openOauthState(SECRET, token, NOW + OAUTH_MAX_AGE)).toBeNull();
    const forged = tamperPayload(token, (data) => { data.state = "attacker"; });
    expect(await openOauthState(SECRET, forged, NOW)).toBeNull();
  });
});

describe("readCookie", () => {
  it("finds a cookie by exact name and keeps '=' inside values", () => {
    expect(readCookie("a=1; digi_ops_session=x.y=; b=2", "digi_ops_session")).toBe("x.y=");
    expect(readCookie("xdigi_ops_session=1", "digi_ops_session")).toBe("");
    expect(readCookie(null, "a")).toBe("");
  });
});
