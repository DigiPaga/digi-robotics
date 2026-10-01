import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Browser-side RPC endpoints of the top-up panel (balance of the connected
 * wallet, receipt polling). Keep in sync with src/lib/ops/chains.ts; a test
 * fails when they drift.
 */
const opsRpcOrigins = ["https://sepolia-rollup.arbitrum.io", "https://rpc.testnet.chain.robinhood.com"];

/**
 * Content-Security-Policy for the /ops surface only (the public site loads
 * third-party wallet and checkout scripts and is out of scope here).
 *
 * This is the tightest policy a static header allows, checked in a browser:
 * - script-src needs 'unsafe-inline' because the App Router streams its payload
 *   through inline scripts whose content changes per render, so they cannot be
 *   hashed, and a static header cannot carry a per-request nonce. Scripts from
 *   any other origin stay blocked. 'unsafe-eval' is for React in `next dev` only.
 * - style-src-elem needs 'unsafe-inline' for the <style> the toast library
 *   injects at runtime. Inline style attributes stay blocked (style-src 'self').
 * - connect-src is same-origin plus the two testnet RPCs the top-up panel calls.
 */
const opsContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self'",
  "style-src-elem 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${opsRpcOrigins.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// /ops is a private operator surface: never indexed, never cached, never framed.
const opsHeaders = [
  { key: "Content-Security-Policy", value: opsContentSecurityPolicy },
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
      { source: "/ops", headers: opsHeaders },
      { source: "/ops/:path*", headers: opsHeaders },
      { source: "/api/ops/:path*", headers: opsHeaders },
    ];
  },
};

export default nextConfig;
