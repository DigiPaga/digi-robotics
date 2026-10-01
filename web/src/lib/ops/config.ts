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
  if (rawBase) {
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

/** Must match an authorized redirect URI on the Google OAuth client byte for byte. */
export function redirectUri(config: OpsConfig, requestUrl: string, host?: string | null): string {
  return `${config.baseUrl ?? publicOrigin(requestUrl, host)}/ops/callback`;
}

/** Cookies are Secure everywhere except plain-http loopback during local development. */
export function cookieSecure(requestUrl: string, host?: string | null): boolean {
  const url = effectiveUrl(requestUrl, host);
  return !(url.protocol === "http:" && isLoopbackHost(url.hostname));
}
