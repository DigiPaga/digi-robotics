// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { config as proxyConfig, proxy } from "../../proxy";
import { OPS_CHAINS } from "./chains";
import { OPS_RPC_ORIGINS, buildOpsContentSecurityPolicy } from "./csp";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

const OPS_SOURCES = ["/api/ops/:path*", "/ops", "/ops/:path*"];
// next.config.ts also returns a sitewide "/:path*" rule with the cheap public security
// headers (DR-C-01/DR-L-13). It carries no CSP and must not weaken anything below.
const ALL_SOURCES = [...OPS_SOURCES, "/:path*"].sort();

async function rules(): Promise<HeaderRule[]> {
  return (await nextConfig.headers!()) as HeaderRule[];
}

function directives(policy: string): Map<string, string[]> {
  return new Map(policy.split(";").map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values] as const;
  }));
}

function responsePolicy(path: string): string {
  const response = proxy(new NextRequest(`https://digirobotics.xyz${path}`));
  const policy = response.headers.get("Content-Security-Policy");
  expect(policy).toBeTruthy();
  return policy!;
}

function nonceOf(policy: string): string {
  const nonces = directives(policy).get("script-src")!.filter((source) => source.startsWith("'nonce-"));
  expect(nonces).toHaveLength(1);
  return nonces[0].slice("'nonce-".length, -1);
}

describe("/ops Content-Security-Policy", () => {
  it("is set by the proxy on every ops route and only there", async () => {
    expect([...proxyConfig.matcher].sort()).toEqual(OPS_SOURCES);
    // The static ops headers stay in next.config.ts, without a CSP that cannot carry a nonce.
    // next.config.ts also returns one sitewide rule (DR-C-01/DR-L-13); no rule anywhere sets CSP.
    const all = await rules();
    expect(all.map((rule) => rule.source).sort()).toEqual(ALL_SOURCES);
    for (const rule of all) {
      expect(rule.headers.map((header) => header.key)).not.toContain("Content-Security-Policy");
    }
    for (const rule of all.filter((rule) => OPS_SOURCES.includes(rule.source))) {
      expect(rule.headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
      expect(rule.headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
      expect(rule.headers).toContainEqual({ key: "Cache-Control", value: "no-store, max-age=0" });
    }
  });

  it("does not weaken the sitewide public headers for /ops, and does not apply ops-only strictness publicly", async () => {
    const all = await rules();
    const publicRule = all.find((rule) => rule.source === "/:path*")!;
    expect(publicRule.headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
    expect(publicRule.headers).toContainEqual({ key: "X-Content-Type-Options", value: "nosniff" });
    // Public pages need real caching and a referrer for analytics/attribution, unlike /ops.
    expect(publicRule.headers.map((header) => header.key)).not.toContain("Cache-Control");
    expect(publicRule.headers).not.toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
  });

  it("uses a fresh nonce per request instead of 'unsafe-inline' for scripts", () => {
    const first = responsePolicy("/ops");
    const second = responsePolicy("/ops/wallets");
    for (const policy of [first, second]) {
      const scriptSrc = directives(policy).get("script-src")!;
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).toEqual(["'self'", `'nonce-${nonceOf(policy)}'`, "'strict-dynamic'"]);
      // Next.js only picks up nonces in this shape (base64, at least 128 bits).
      expect(nonceOf(policy)).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    }
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it("forwards the same policy on the request so Next.js stamps its scripts with the nonce", () => {
    const response = proxy(new NextRequest("https://digirobotics.xyz/api/ops/overview"));
    const sent = response.headers.get("Content-Security-Policy");
    const forwarded = response.headers.get("x-middleware-request-content-security-policy");
    expect(forwarded).toBe(sent);
    expect(response.headers.get("x-middleware-override-headers")).toContain("content-security-policy");
  });

  it("allows only same-origin resources plus the ops chain RPCs", () => {
    const policy = responsePolicy("/ops");
    const csp = directives(policy);
    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("style-src")).toEqual(["'self'"]);
    expect(csp.get("style-src-elem")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    const rpcOrigins = OPS_CHAINS.map((chain) => new URL(chain.rpcUrls.default.http[0]).origin);
    expect(OPS_RPC_ORIGINS).toEqual(rpcOrigins);
    expect(csp.get("connect-src")).toEqual(["'self'", ...rpcOrigins]);
    expect(policy).not.toMatch(/\*|unsafe-eval|http:/);
  });

  it("does not let the browser reach the upstreams the server calls for the console", () => {
    const policy = responsePolicy("/ops");
    const connect = directives(policy).get("connect-src")!;
    // GitHub and the x402 server are fetched server-side only. The browser talks to /api/ops/*.
    expect(connect).toHaveLength(1 + OPS_CHAINS.length);
    expect(policy).not.toMatch(/github|x402|localhost/i);
    // The console sets no inline style attributes, so style-src stays strict.
    expect(directives(policy).get("style-src")).toEqual(["'self'"]);
  });

  it("allows eval only for React in next dev", () => {
    expect(directives(buildOpsContentSecurityPolicy("abc", { isDev: true })).get("script-src")).toContain("'unsafe-eval'");
    expect(directives(buildOpsContentSecurityPolicy("abc")).get("script-src")).not.toContain("'unsafe-eval'");
  });
});
