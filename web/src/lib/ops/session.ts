import "server-only";

import { isAllowedEmail } from "./allowlist";
import type { OpsConfig } from "./config";
import { randomToken, seal, unseal } from "./crypto";

const SESSION_COOKIE_BASE = "digi_ops_session";
const OAUTH_COOKIE_BASE = "digi_ops_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 12;
export const OAUTH_MAX_AGE = 60 * 10;

export interface OpsSession {
  email: string;
  csrf: string;
  exp: number;
}

export interface OauthState {
  state: string;
  nonce: string;
  verifier: string;
  exp: number;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function sealSession(secret: string, email: string, now = nowSeconds()): Promise<string> {
  return seal(secret, "session", { email, csrf: randomToken(18), exp: now + SESSION_MAX_AGE } satisfies OpsSession);
}

export async function openSession(secret: string, raw: string | undefined | null, now = nowSeconds()): Promise<OpsSession | null> {
  const data = await unseal<OpsSession>(secret, "session", raw);
  if (!data) return null;
  if (typeof data.exp !== "number" || data.exp <= now) return null;
  if (typeof data.email !== "string" || typeof data.csrf !== "string") return null;
  return { email: data.email, csrf: data.csrf, exp: data.exp };
}

export function newOauthState(): Omit<OauthState, "exp"> {
  return { state: randomToken(), nonce: randomToken(), verifier: randomToken(48) };
}

export async function sealOauthState(secret: string, state: Omit<OauthState, "exp">, now = nowSeconds()): Promise<string> {
  return seal(secret, "oauth", { ...state, exp: now + OAUTH_MAX_AGE } satisfies OauthState);
}

export async function openOauthState(secret: string, raw: string | undefined | null, now = nowSeconds()): Promise<OauthState | null> {
  const data = await unseal<OauthState>(secret, "oauth", raw);
  if (!data) return null;
  if (typeof data.exp !== "number" || data.exp <= now) return null;
  if (typeof data.state !== "string" || typeof data.nonce !== "string" || typeof data.verifier !== "string") return null;
  return { state: data.state, nonce: data.nonce, verifier: data.verifier, exp: data.exp };
}

export function readCookie(header: string | null | undefined, name: string): string {
  if (!header) return "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

/**
 * Opens the session and re-checks the allowlist, so removing an address from
 * OPS_ALLOWED_EMAILS locks out existing sessions on the next request.
 */
export async function sessionFromCookieValue(config: OpsConfig, raw: string | undefined | null): Promise<OpsSession | null> {
  const session = await openSession(config.sessionSecret, raw);
  if (!session || !isAllowedEmail(session.email, config.allowlist)) return null;
  return session;
}

/**
 * `__Host-` makes the browser refuse the cookie unless it is Secure, has
 * Path=/ and no Domain, so a sibling subdomain or a plain-http page cannot
 * plant or overwrite it. The prefix is invalid without Secure, so plain-http
 * localhost keeps the bare name.
 */
export function sessionCookieName(secure: boolean): string {
  return secure ? `__Host-${SESSION_COOKIE_BASE}` : SESSION_COOKIE_BASE;
}

/** Scoped to /ops, and `__Host-` requires Path=/, so this one gets `__Secure-` instead. */
export function oauthCookieName(secure: boolean): string {
  return secure ? `__Secure-${OAUTH_COOKIE_BASE}` : OAUTH_COOKIE_BASE;
}

/**
 * Lax, not Strict: the OAuth state cookie must survive the top-level redirect
 * back from Google. Never sets Domain: both cookies are host-only.
 */
export function cookieOptions(secure: boolean, maxAge: number, path: string) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path, maxAge };
}

export function sessionCookieOptions(secure: boolean, maxAge = SESSION_MAX_AGE) {
  return cookieOptions(secure, maxAge, "/");
}

export function oauthCookieOptions(secure: boolean, maxAge = OAUTH_MAX_AGE) {
  return cookieOptions(secure, maxAge, "/ops");
}
