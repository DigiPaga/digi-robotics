// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pkceChallenge } from "./crypto";
import { authorizeUrl, isGoogleAuthoritative, validateIdTokenClaims } from "./google";

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

    it("accepts consumer Gmail addresses without a hosted domain", () => {
      expect(validateIdTokenClaims({ ...good, email: "Otto.Devs@googlemail.com" }, "cid", "n1", now)).toBe("otto.devs@googlemail.com");
    });

    it("accepts a Workspace address only when hd names the same domain", () => {
      const workspace = { ...good, email: "Oscar@DigiPaga.xyz" };
      expect(validateIdTokenClaims({ ...workspace, hd: "digipaga.xyz" }, "cid", "n1", now)).toBe("oscar@digipaga.xyz");
      expect(validateIdTokenClaims({ ...workspace, hd: "DigiPaga.XYZ" }, "cid", "n1", now)).toBe("oscar@digipaga.xyz");
    });

    it.each([
      ["no hd claim", {}],
      ["another Workspace domain", { hd: "evil.example" }],
      ["a parent domain", { hd: "xyz" }],
      ["a subdomain of the email domain", { hd: "mail.digipaga.xyz" }],
      ["a non-string hd", { hd: true }],
      ["an empty hd", { hd: "" }],
    ])("rejects a non-Gmail address with %s", (_name, patch) => {
      expect(validateIdTokenClaims({ ...good, email: "oscar@digipaga.xyz", ...patch }, "cid", "n1", now)).toBeNull();
    });

    it("rejects lookalike domains and malformed addresses", () => {
      for (const email of ["x@gmail.com.evil.example", "x@notgmail.com", "x@mail.gmail.com", "@gmail.com", "gmail.com", "x@"]) {
        expect(validateIdTokenClaims({ ...good, email }, "cid", "n1", now)).toBeNull();
      }
    });
  });

  it("treats only Gmail and matching Workspace domains as Google-authoritative", () => {
    expect(isGoogleAuthoritative("a@gmail.com", undefined)).toBe(true);
    expect(isGoogleAuthoritative("a@googlemail.com", undefined)).toBe(true);
    expect(isGoogleAuthoritative("a@corp.example", "corp.example")).toBe(true);
    expect(isGoogleAuthoritative("a@corp.example", undefined)).toBe(false);
    expect(isGoogleAuthoritative("a@outlook.com", "gmail.com")).toBe(false);
  });
});
