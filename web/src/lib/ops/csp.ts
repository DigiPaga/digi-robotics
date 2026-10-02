import { OPS_CHAINS } from "./chains";

/**
 * Browser-side RPC origins of the top-up panel (balance of the connected
 * wallet, receipt polling), derived from the ops chains so they cannot drift.
 */
export const OPS_RPC_ORIGINS: readonly string[] = [
  ...new Set(OPS_CHAINS.map((chain) => new URL(chain.rpcUrls.default.http[0]).origin)),
];

/**
 * Fresh nonce for one request: 128 random bits, base64. Web Crypto only, so it
 * runs unchanged in Node and on Cloudflare Workers.
 */
export function createCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Content-Security-Policy for the /ops surface only (the public site loads
 * third-party wallet and checkout scripts and is out of scope here). The proxy
 * builds it per request, and Next.js reads the nonce back from the request
 * header to stamp its own inline and bundle scripts.
 *
 * - script-src: only scripts carrying this request's nonce, plus what they load
 *   ('strict-dynamic'). 'self' is a fallback for browsers without CSP3 and is
 *   ignored by those that support 'strict-dynamic'. 'unsafe-eval' is for React
 *   in `next dev` only.
 * - style-src-elem keeps 'unsafe-inline' for the <style> the toast library
 *   injects at runtime without a nonce (adding a nonce would disable
 *   'unsafe-inline' and block it). Inline style attributes stay blocked
 *   (style-src 'self').
 * - connect-src is same-origin plus the RPCs the top-up panel calls.
 */
export function buildOpsContentSecurityPolicy(nonce: string, { isDev = false }: { isDev?: boolean } = {}): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self'",
    "style-src-elem 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${OPS_RPC_ORIGINS.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
