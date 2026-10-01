import type { NextConfig } from "next";

// /ops is a private operator surface: never indexed, never cached, never framed.
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
      { source: "/ops", headers: opsHeaders },
      { source: "/ops/:path*", headers: opsHeaders },
      { source: "/api/ops/:path*", headers: opsHeaders },
    ];
  },
};

export default nextConfig;
