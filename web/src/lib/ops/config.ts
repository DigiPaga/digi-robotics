import "server-only";

import { parseAllowlist } from "./allowlist";

/** Server-only env. None of these are NEXT_PUBLIC_, so they never reach the client bundle. */
export const OPS_REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPS_SESSION_SECRET",
  "OPS_ALLOWED_EMAILS",
] as const;

export const MIN_SESSION_SECRET_LENGTH = 32;

export interface OpsConfig {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  allowlist: ReadonlySet<string>;
  baseUrl: string | null;
}

export type OpsConfigResult =
  | { ok: true; config: OpsConfig }
  | { ok: false; problems: string[] };

type Env = Record<string, string | undefined>;

/**
 * The literal `process.env.NODE_ENV` is inlined by the Next.js build, so a
 * production bundle stays strict even on a runtime that does not set NODE_ENV.
 */
export function isProduction(env: Env = process.env): boolean {
  return env.NODE_ENV === "production" || (env === process.env && process.env.NODE_ENV === "production");
}

/**
 * Reads the /ops configuration. Fails closed: anything missing or weak makes
 * /ops show "not configured" and no session can be issued or accepted.
 */
export function readOpsConfig(env: Env = process.env): OpsConfigResult {
  const problems: string[] = [];
  for (const name of OPS_REQUIRED_ENV) {
    if (!env[name]?.trim()) problems.push(`${name} is not set`);
  }
  const sessionSecret = env.OPS_SESSION_SECRET?.trim() ?? "";
  if (sessionSecret && sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    problems.push(`OPS_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`);
  }
  const allowlist = parseAllowlist(env.OPS_ALLOWED_EMAILS);
  if (env.OPS_ALLOWED_EMAILS?.trim() && allowlist.size === 0) {
    problems.push("OPS_ALLOWED_EMAILS has no valid email addresses");
  }
  let baseUrl: string | null = null;
  const rawBase = env.OPS_BASE_URL?.trim();
  if (!rawBase) {
    // Without it every redirect target would come from the Host header.
    if (isProduction(env)) problems.push("OPS_BASE_URL is required in production");
  } else {
    try {
      const parsed = new URL(rawBase);
      if (parsed.protocol !== "https:" && !isLoopbackHost(parsed.hostname)) {
        problems.push("OPS_BASE_URL must use https (http is only allowed for localhost)");
      } else {
        baseUrl = parsed.origin;
      }
    } catch {
      problems.push("OPS_BASE_URL is not a valid URL");
    }
  }
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    config: {
      clientId: env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: env.GOOGLE_CLIENT_SECRET!.trim(),
      sessionSecret,
      allowlist,
      baseUrl,
    },
  };
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/** The request URL as seen through the Host header (which replaces host and port together). */
function effectiveUrl(requestUrl: string, host?: string | null): URL {
  const url = new URL(requestUrl);
  if (!host) return url;
  try {
    const hosted = new URL(`${url.protocol}//${host}`);
    url.hostname = hosted.hostname;
    url.port = hosted.port;
  } catch {
    // Malformed Host header: keep the request URL.
  }
  return url;
}

/**
 * The origin the browser actually used. Behind a TLS-terminating proxy the
 * request URL can say http, so any non-loopback host is treated as https.
 */
export function publicOrigin(requestUrl: string, host?: string | null): string {
  const url = effectiveUrl(requestUrl, host);
  if (!isLoopbackHost(url.hostname)) url.protocol = "https:";
  return url.origin;
}

/**
 * Origin derived from the request. The Host header is client-controlled, so
 * this is a development convenience only: production gets null and must use
 * OPS_BASE_URL.
 */
export function devRequestOrigin(requestUrl: string, host?: string | null, env: Env = process.env): string | null {
  return isProduction(env) ? null : publicOrigin(requestUrl, host);
}

/** Must match an authorized redirect URI on the Google OAuth client byte for byte. */
export function redirectUri(config: OpsConfig, requestUrl: string, host?: string | null, env: Env = process.env): string {
  const origin = config.baseUrl ?? devRequestOrigin(requestUrl, host, env);
  // Unreachable through readOpsConfig, which requires OPS_BASE_URL in production.
  if (!origin) throw new Error("OPS_BASE_URL is required in production");
  return `${origin}/ops/callback`;
}

/**
 * Cookies are Secure everywhere except plain-http loopback during local
 * development. This also picks the cookie names (`__Host-` / `__Secure-` need
 * Secure), so it has to give the same answer when a cookie is set and when it
 * is read: OPS_BASE_URL decides whenever it is set, which is always the case in
 * production. Only development without it looks at the request.
 */
export function cookieSecure(config: OpsConfig, requestUrl: string, host?: string | null, env: Env = process.env): boolean {
  if (config.baseUrl) return !config.baseUrl.startsWith("http://");
  if (isProduction(env)) return true;
  const url = effectiveUrl(requestUrl, host);
  return !(url.protocol === "http:" && isLoopbackHost(url.hostname));
}
