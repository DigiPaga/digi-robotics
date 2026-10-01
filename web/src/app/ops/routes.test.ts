// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { openOauthState, sealSession } from "@/lib/ops/session";
import { pkceChallenge } from "@/lib/ops/crypto";
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

function setCookieValue(response: Response, name: string): string {
  const header = response.headers.getSetCookie().find((item) => item.startsWith(`${name}=`)) ?? "";
  return header.slice(name.length + 1).split(";")[0];
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

  it("requires the session csrf token, then clears the session", async () => {
    configure();
    const token = await sealSession(SECRET, "ottodevs@gmail.com");
    const { openSession } = await import("@/lib/ops/session");
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
