// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pkceChallenge } from "./crypto";
import { authorizeUrl, validateIdTokenClaims } from "./google";

describe("Google OAuth helpers", () => {
  it("computes the RFC 7636 S256 code challenge", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("builds an authorization URL with PKCE, state, nonce and minimal scopes", () => {
    const url = new URL(authorizeUrl({
      clientId: "client.apps.googleusercontent.com",
      redirectUri: "https://digirobotics.test/ops/callback",
      state: "st",
      nonce: "nn",
      codeChallenge: "cc",
    }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "client.apps.googleusercontent.com",
      redirect_uri: "https://digirobotics.test/ops/callback",
      response_type: "code",
      scope: "openid email",
      state: "st",
      nonce: "nn",
      code_challenge: "cc",
      code_challenge_method: "S256",
    });
  });

  describe("validateIdTokenClaims", () => {
    const now = 1_800_000_000;
    const good = { iss: "https://accounts.google.com", aud: "cid", exp: now + 600, iat: now - 5, nonce: "n1", email: "OttoDevs@gmail.com", email_verified: true };

    it("accepts valid claims and lowercases the email", () => {
      expect(validateIdTokenClaims(good, "cid", "n1", now)).toBe("ottodevs@gmail.com");
      expect(validateIdTokenClaims({ ...good, iss: "accounts.google.com" }, "cid", "n1", now)).toBe("ottodevs@gmail.com");
    });

    it.each([
      ["issuer", { iss: "https://evil.example" }],
      ["audience", { aud: "other-client" }],
      ["expired", { exp: now }],
      ["issued in the future", { iat: now + 3600 }],
      ["nonce", { nonce: "other" }],
      ["missing nonce", { nonce: undefined }],
      ["unverified email", { email_verified: false }],
      ["string email_verified", { email_verified: "true" }],
      ["missing email", { email: undefined }],
    ])("rejects a bad %s", (_name, patch) => {
      expect(validateIdTokenClaims({ ...good, ...patch }, "cid", "n1", now)).toBeNull();
    });
  });
});
