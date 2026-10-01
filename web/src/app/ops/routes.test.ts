// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { openOauthState, openSession, sealOauthState, sealSession } from "@/lib/ops/session";
import { b64url, pkceChallenge } from "@/lib/ops/crypto";
import { GET as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as callback } from "./callback/route";

const SECRET = "z".repeat(40);

function configure() {
  vi.stubEnv("GOOGLE_CLIENT_ID", "fake-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "fake-secret");
  vi.stubEnv("OPS_SESSION_SECRET", SECRET);
  vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com");
}

function setCookieHeader(response: Response, name: string): string {
  return response.headers.getSetCookie().find((item) => item.startsWith(`${name}=`)) ?? "";
}

function setCookieValue(response: Response, name: string): string {
  return setCookieHeader(response, name).slice(name.length + 1).split(";")[0];
}

/** A production deployment behind https: prefixed cookie names, OPS_BASE_URL is the only origin. */
function configureProduction() {
  configure();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OPS_BASE_URL", "https://ops.example.test");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("/ops/login", () => {
  it("redirects to /ops when not configured", async () => {
    const response = await login(new Request("http://localhost:46200/ops/login", { headers: { host: "localhost:46200" } }));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:46200/ops");
  });

  it("redirects to Google with PKCE and a sealed state cookie", async () => {
    configure();
    const response = await login(new Request("http://localhost:46200/ops/login", { headers: { host: "localhost:46200" } }));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:46200/ops/callback");
    const raw = setCookieValue(response, "digi_ops_oauth");
    const stored = await openOauthState(SECRET, raw);
    expect(stored?.state).toBe(location.searchParams.get("state"));
    expect(stored?.nonce).toBe(location.searchParams.get("nonce"));
    expect(location.searchParams.get("code_challenge")).toBe(await pkceChallenge(stored!.verifier));
    const cookie = response.headers.getSetCookie().join("\n");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\/ops/);
    // Plain http on localhost: no Secure, so no prefixed name either.
    expect(cookie).not.toMatch(/Secure|__Secure-|__Host-/);
  });
});

describe("in production", () => {
  const evil = { host: "evil.example", "x-forwarded-host": "evil.example" };

  it("builds redirect_uri from OPS_BASE_URL whatever the Host header says", async () => {
    configureProduction();
    const response = await login(new Request("http://127.0.0.1:3000/ops/login", { headers: evil }));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe("https://ops.example.test/ops/callback");
    expect(response.headers.get("location")).not.toContain("evil.example");
  });

  it("sends callback failures to OPS_BASE_URL, not to the Host header", async () => {
    configureProduction();
    const response = await callback(new Request("http://127.0.0.1:3000/ops/callback?code=c&state=s", { headers: evil }));
    expect(response.headers.get("location")).toBe("https://ops.example.test/ops?error=failed");
  });

  it("is unconfigured without OPS_BASE_URL and redirects with a relative Location", async () => {
    configure();
    vi.stubEnv("NODE_ENV", "production");
    const response = await login(new Request("http://127.0.0.1:3000/ops/login", { headers: evil }));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/ops");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const back = await callback(new Request("http://127.0.0.1:3000/ops/callback?code=c&state=s", { headers: evil }));
    expect(back.headers.get("location")).toBe("/ops");
  });

  it("sets the OAuth state cookie as __Secure-, Secure, HttpOnly and scoped to /ops", async () => {
    configureProduction();
    const response = await login(new Request("http://127.0.0.1:3000/ops/login", { headers: evil }));
    expect(response.headers.getSetCookie()).toHaveLength(1);
    const cookie = setCookieHeader(response, "__Secure-digi_ops_oauth");
    expect(await openOauthState(SECRET, setCookieValue(response, "__Secure-digi_ops_oauth"))).not.toBeNull();
    expect(cookie).toMatch(/; Path=\/ops(;|$)/);
    expect(cookie).toMatch(/; Secure(;|$)/i);
    expect(cookie).toMatch(/; HttpOnly(;|$)/i);
    expect(cookie).toMatch(/; SameSite=lax(;|$)/i);
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("clears the __Host- session cookie on logout with the attributes the prefix requires", async () => {
    configureProduction();
    const response = await logout(new Request("http://127.0.0.1:3000/ops/logout", { method: "POST", headers: { ...evil, origin: "https://ops.example.test" } }));
    const cookie = setCookieHeader(response, "__Host-digi_ops_session");
    expect(cookie).toMatch(/^__Host-digi_ops_session=; /);
    expect(cookie).toMatch(/; Path=\/(;|$)/);
    expect(cookie).toMatch(/; Max-Age=0(;|$)/i);
    expect(cookie).toMatch(/; Secure(;|$)/i);
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("checks the logout origin against OPS_BASE_URL only", async () => {
    configureProduction();
    const post = (origin: string) => logout(new Request("http://127.0.0.1:3000/ops/logout", { method: "POST", headers: { ...evil, origin } }));
    expect((await post("https://evil.example")).status).toBe(403);
    const ok = await post("https://ops.example.test");
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("https://ops.example.test/ops");
  });
});

describe("/ops/callback", () => {
  it("fails without a matching state cookie and never calls Google", async () => {
    configure();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await callback(new Request("http://localhost:46200/ops/callback?code=c&state=s", { headers: { host: "localhost:46200" } }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:46200/ops?error=failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("with a Google-signed ID token", () => {
    const KID = "test-key";
    let keys: CryptoKeyPair;
    let jwk: JsonWebKey;

    beforeAll(async () => {
      keys = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["sign", "verify"],
      );
      jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
    });

    async function signIdToken(claims: Record<string, unknown>): Promise<string> {
      const encode = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));
      const signed = `${encode({ alg: "RS256", kid: KID, typ: "JWT" })}.${encode(claims)}`;
      const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(signed));
      return `${signed}.${b64url(new Uint8Array(signature))}`;
    }

    /** Runs the callback as if Google had returned an ID token carrying `identity`. */
    async function finishSignIn(identity: Record<string, unknown>, deployment: "local" | "production" = "local"): Promise<Response> {
      if (deployment === "production") configureProduction();
      else configure();
      vi.stubEnv("OPS_ALLOWED_EMAILS", "ottodevs@gmail.com, oscar@digipaga.xyz");
      const now = Math.floor(Date.now() / 1000);
      const idToken = await signIdToken({
        iss: "https://accounts.google.com",
        aud: "fake-client",
        exp: now + 600,
        iat: now,
        nonce: "nonce-1",
        email_verified: true,
        ...identity,
      });
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("https://oauth2.googleapis.com/token")) return Response.json({ id_token: idToken });
        if (url.startsWith("https://www.googleapis.com/oauth2/v3/certs")) return Response.json({ keys: [{ ...jwk, kid: KID }] });
        throw new Error(`unexpected fetch ${url}`);
      }));
      const oauth = await sealOauthState(SECRET, { state: "state-1", nonce: "nonce-1", verifier: "v".repeat(64) });
      if (deployment === "production") {
        return callback(new Request("http://127.0.0.1:3000/ops/callback?code=c&state=state-1", {
          headers: { host: "ops.example.test", cookie: `__Secure-digi_ops_oauth=${oauth}` },
        }));
      }
      return callback(new Request("http://localhost:46200/ops/callback?code=c&state=state-1", {
        headers: { host: "localhost:46200", cookie: `digi_ops_oauth=${oauth}` },
      }));
    }

    it("sets the session as a __Host- cookie on https: Secure, HttpOnly, Path=/, no Domain", async () => {
      const response = await finishSignIn({ email: "ottodevs@gmail.com" }, "production");
      expect(response.headers.get("location")).toBe("https://ops.example.test/ops");
      const cookie = setCookieHeader(response, "__Host-digi_ops_session");
      expect((await openSession(SECRET, setCookieValue(response, "__Host-digi_ops_session")))?.email).toBe("ottodevs@gmail.com");
      expect(cookie).toMatch(/; Path=\/(;|$)/);
      expect(cookie).toMatch(/; Secure(;|$)/i);
      expect(cookie).toMatch(/; HttpOnly(;|$)/i);
      expect(cookie).toMatch(/; SameSite=lax(;|$)/i);
      expect(cookie).toMatch(/; Max-Age=43200(;|$)/i);
      expect(cookie).not.toMatch(/Domain=/i);
      expect(setCookieHeader(response, "digi_ops_session")).toBe("");
      expect(setCookieHeader(response, "__Secure-digi_ops_oauth")).toMatch(/^__Secure-digi_ops_oauth=; .*Max-Age=0/i);
    });

    it("ignores an unprefixed OAuth state cookie on https", async () => {
      configureProduction();
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const oauth = await sealOauthState(SECRET, { state: "state-1", nonce: "nonce-1", verifier: "v".repeat(64) });
      const response = await callback(new Request("http://127.0.0.1:3000/ops/callback?code=c&state=state-1", {
        headers: { host: "ops.example.test", cookie: `digi_ops_oauth=${oauth}` },
      }));
      expect(response.headers.get("location")).toBe("https://ops.example.test/ops?error=failed");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("sets a plain, non-Secure session cookie on http localhost", async () => {
      const response = await finishSignIn({ email: "ottodevs@gmail.com" });
      const cookie = setCookieHeader(response, "digi_ops_session");
      expect(cookie).toMatch(/; Path=\/(;|$)/);
      expect(cookie).toMatch(/; HttpOnly(;|$)/i);
      expect(cookie).not.toMatch(/Secure|Domain=/i);
      expect(response.headers.getSetCookie().join("\n")).not.toMatch(/__Host-|__Secure-/);
    });

    it("issues a session for an allowlisted Gmail account", async () => {
      const response = await finishSignIn({ email: "ottodevs@gmail.com" });
      expect(response.headers.get("location")).toBe("http://localhost:46200/ops");
      const session = await openSession(SECRET, setCookieValue(response, "digi_ops_session"));
      expect(session?.email).toBe("ottodevs@gmail.com");
    });

    it("issues a session for an allowlisted Workspace account whose hd matches", async () => {
      const response = await finishSignIn({ email: "oscar@digipaga.xyz", hd: "digipaga.xyz" });
      expect(response.headers.get("location")).toBe("http://localhost:46200/ops");
      expect((await openSession(SECRET, setCookieValue(response, "digi_ops_session")))?.email).toBe("oscar@digipaga.xyz");
    });

    it.each([
      ["without hd", {}],
      ["with a foreign hd", { hd: "evil.example" }],
    ])("refuses an allowlisted non-Gmail address %s", async (_name, patch) => {
      const response = await finishSignIn({ email: "oscar@digipaga.xyz", ...patch });
      expect(response.headers.get("location")).toBe("http://localhost:46200/ops?error=failed");
      expect(setCookieValue(response, "digi_ops_session")).toBe("");
    });

    it("still denies a Gmail account that is not allowlisted", async () => {
      const response = await finishSignIn({ email: "intruder@gmail.com" });
      expect(response.headers.get("location")).toBe("http://localhost:46200/ops?error=denied");
      expect(setCookieValue(response, "digi_ops_session")).toBe("");
    });
  });
});

describe("/ops/logout", () => {
  it("refuses cross-origin posts", async () => {
    configure();
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const response = await logout(new Request("http://localhost:46200/ops/logout", {
      method: "POST",
      headers: { host: "localhost:46200", origin: "https://evil.example", cookie: `digi_ops_session=${token}` },
    }));
    expect(response.status).toBe(403);
  });

  it("accepts the Origin: null a no-referrer page sends, but only with Sec-Fetch-Site: same-origin", async () => {
    configure();
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const session = await openSession(SECRET, token);
    const post = (headers: Record<string, string>) => logout(new Request("http://localhost:46200/ops/logout", {
      method: "POST",
      headers: { host: "localhost:46200", cookie: `digi_ops_session=${token}`, "content-type": "application/x-www-form-urlencoded", ...headers },
      body: new URLSearchParams({ csrf: session!.csrf }),
    }));
    expect((await post({ origin: "null" })).status).toBe(403);
    expect((await post({ origin: "null", "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post({ origin: "null", "sec-fetch-site": "same-site" })).status).toBe(403);
    expect((await post({ origin: "https://evil.example", "sec-fetch-site": "same-origin" })).status).toBe(403);
    const ok = await post({ origin: "null", "sec-fetch-site": "same-origin" });
    expect(ok.status).toBe(303);
    expect(ok.headers.getSetCookie().join("\n")).toMatch(/digi_ops_session=;.*Max-Age=0/i);
  });

  it("requires the session csrf token, then clears the session", async () => {
    configure();
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const session = await openSession(SECRET, token);
    const post = (csrf: string) => logout(new Request("http://localhost:46200/ops/logout", {
      method: "POST",
      headers: { host: "localhost:46200", origin: "http://localhost:46200", cookie: `digi_ops_session=${token}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrf }),
    }));
    expect((await post("wrong")).status).toBe(403);
    const ok = await post(session!.csrf);
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("http://localhost:46200/ops");
    expect(ok.headers.getSetCookie().join("\n")).toMatch(/digi_ops_session=;.*Max-Age=0/i);
  });
});
