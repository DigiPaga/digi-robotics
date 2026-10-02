import type { NextConfig } from "next";

// Cheap, safe-everywhere headers for every public route (DR-C-01, DR-L-13). No
// Content-Security-Policy here: the public site loads third-party wallet/checkout scripts
// (thirdweb, ZeroDev) and a CSP needs their origins audited first, which is out of scope
// before the submission deadline — see audit-code-security-2026-10-02.md DR-C-01.
const publicHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

// /ops is a private operator surface: never indexed, never cached, never framed.
// Its Content-Security-Policy carries a per-request nonce, so src/proxy.ts sets it.
// Declared after publicHeaders below: Next.js applies later header() entries last when two
// rules match the same path and set the same key, so these values win over publicHeaders'
// for Referrer-Policy and Cache-Control on every /ops* path (no-referrer and no-store stay
// stricter than the sitewide defaults, nothing here is weakened).
const opsHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    useTypeScriptCli: false,
    webpackBuildWorker: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: publicHeaders },
      { source: "/ops", headers: opsHeaders },
      { source: "/ops/:path*", headers: opsHeaders },
      { source: "/api/ops/:path*", headers: opsHeaders },
    ];
  },
};

export default nextConfig;
