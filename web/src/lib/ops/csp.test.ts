// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { OPS_CHAINS } from "./chains";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<HeaderRule[]> {
  return (await nextConfig.headers!()) as HeaderRule[];
}

function directives(policy: string): Map<string, string[]> {
  return new Map(policy.split(";").map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values] as const;
  }));
}

describe("/ops Content-Security-Policy", () => {
  it("is sent on every ops route and only there", async () => {
    const all = await rules();
    expect(all.map((rule) => rule.source).sort()).toEqual(["/api/ops/:path*", "/ops", "/ops/:path*"]);
    const policies = all.map((rule) => rule.headers.find((header) => header.key === "Content-Security-Policy")?.value);
    expect(new Set(policies).size).toBe(1);
    expect(policies[0]).toBeTruthy();
  });

  it("allows only same-origin resources plus the ops chain RPCs", async () => {
    const policy = (await rules())[0].headers.find((header) => header.key === "Content-Security-Policy")!.value;
    const csp = directives(policy);
    expect(csp.get("default-src")).toEqual(["'self'"]);
    // Outside `next dev`: inline is unavoidable with a static header, eval and foreign origins are not allowed.
    expect(csp.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get("style-src")).toEqual(["'self'"]);
    expect(csp.get("style-src-elem")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    const rpcOrigins = OPS_CHAINS.map((chain) => new URL(chain.rpcUrls.default.http[0]).origin);
    expect(csp.get("connect-src")).toEqual(["'self'", ...rpcOrigins]);
    expect(policy).not.toMatch(/\*|unsafe-eval|http:/);
  });

  it("does not let the browser reach the upstreams the server calls for the console", async () => {
    const policy = (await rules())[0].headers.find((header) => header.key === "Content-Security-Policy")!.value;
    const connect = directives(policy).get("connect-src")!;
    // GitHub and the x402 server are fetched server-side only. The browser talks to /api/ops/*.
    expect(connect).toHaveLength(1 + OPS_CHAINS.length);
    expect(policy).not.toMatch(/github|x402|localhost/i);
    // The console sets no inline style attributes, so style-src stays strict.
    expect(directives(policy).get("style-src")).toEqual(["'self'"]);
  });
});
