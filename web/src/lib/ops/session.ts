import { isAllowedEmail } from "./allowlist";
import type { OpsConfig } from "./config";
import { randomToken, seal, unseal } from "./crypto";

export const SESSION_COOKIE = "digi_ops_session";
export const OAUTH_COOKIE = "digi_ops_oauth";
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
  return seal(secret, { email, csrf: randomToken(18), exp: now + SESSION_MAX_AGE } satisfies OpsSession);
}

export async function openSession(secret: string, raw: string | undefined | null, now = nowSeconds()): Promise<OpsSession | null> {
  const data = await unseal<OpsSession>(secret, raw);
  if (!data) return null;
  if (typeof data.exp !== "number" || data.exp <= now) return null;
  if (typeof data.email !== "string" || typeof data.csrf !== "string") return null;
  return { email: data.email, csrf: data.csrf, exp: data.exp };
}

export function newOauthState(): Omit<OauthState, "exp"> {
  return { state: randomToken(), nonce: randomToken(), verifier: randomToken(48) };
}

export async function sealOauthState(secret: string, state: Omit<OauthState, "exp">, now = nowSeconds()): Promise<string> {
  return seal(secret, { ...state, exp: now + OAUTH_MAX_AGE } satisfies OauthState);
}

export async function openOauthState(secret: string, raw: string | undefined | null, now = nowSeconds()): Promise<OauthState | null> {
  const data = await unseal<OauthState>(secret, raw);
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

/** Lax, not Strict: the OAuth state cookie must survive the top-level redirect back from Google. */
export function cookieOptions(secure: boolean, maxAge: number, path: string) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path, maxAge };
}

export function sessionCookieOptions(secure: boolean, maxAge = SESSION_MAX_AGE) {
  return cookieOptions(secure, maxAge, "/");
}

export function oauthCookieOptions(secure: boolean, maxAge = OAUTH_MAX_AGE) {
  return cookieOptions(secure, maxAge, "/ops");
}
