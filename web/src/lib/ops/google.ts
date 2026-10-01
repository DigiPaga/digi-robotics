/**
 * Google OpenID Connect for /ops: authorization code + PKCE + state + nonce.
 * The ID token is verified locally against Google's JWKS. The only claim kept
 * is the email, and only when Google is authoritative for that address (see
 * isGoogleAuthoritative). Nothing from Google is logged.
 */
import "server-only";

import { b64urlDecode } from "./crypto";

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const JWKS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 300;

export function authorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("nonce", opts.nonce);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** Swaps the code for an ID token server-side. Null on any failure. */
export async function exchangeCode(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id_token?: unknown };
    return typeof data.id_token === "string" ? data.id_token : null;
  } catch {
    return null;
  }
}

type Jwk = JsonWebKey & { kid?: string };
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

async function googleKeys(forceRefresh: boolean): Promise<Jwk[]> {
  if (!forceRefresh && jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(JWKS_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error("jwks unavailable");
  const { keys } = (await res.json()) as { keys?: Jwk[] };
  jwksCache = { keys: Array.isArray(keys) ? keys : [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function googleKey(kid: string): Promise<CryptoKey | null> {
  try {
    let jwk = (await googleKeys(false)).find((key) => key.kid === kid && key.kty === "RSA");
    // Google rotates keys; a miss on a cached set gets one fresh fetch.
    if (!jwk) jwk = (await googleKeys(true)).find((key) => key.kid === kid && key.kty === "RSA");
    if (!jwk) return null;
    return await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch {
    return null;
  }
}

function decodeJson<T>(part: string): T | null {
  const bytes = b64urlDecode(part);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export interface IdTokenClaims {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  email?: unknown;
  email_verified?: unknown;
  hd?: unknown;
}

const GOOGLE_CONSUMER_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * A Google account can be created on any address, so `email` plus
 * `email_verified` alone do not prove who owns the mailbox today. Google only
 * vouches for the address when it runs the mailbox itself: consumer Gmail, or a
 * Workspace domain, which the signed `hd` claim names. Anything else is refused,
 * even when the address is on the allowlist.
 */
export function isGoogleAuthoritative(email: string, hostedDomain: unknown): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (!domain) return false;
  if (GOOGLE_CONSUMER_DOMAINS.has(domain)) return true;
  return typeof hostedDomain === "string" && hostedDomain.trim().toLowerCase() === domain;
}

/**
 * Checks iss, aud, exp, iat, nonce, email_verified and that Google is
 * authoritative for the address. Returns the lowercase email or null.
 */
export function validateIdTokenClaims(claims: IdTokenClaims, clientId: string, nonce: string, now = Math.floor(Date.now() / 1000)): string | null {
  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) return null;
  if (claims.aud !== clientId) return null;
  if (typeof claims.exp !== "number" || claims.exp <= now) return null;
  if (typeof claims.iat !== "number" || claims.iat > now + CLOCK_SKEW_SECONDS) return null;
  if (typeof claims.nonce !== "string" || claims.nonce !== nonce) return null;
  if (claims.email_verified !== true) return null;
  if (typeof claims.email !== "string") return null;
  const email = claims.email.trim().toLowerCase();
  if (email.lastIndexOf("@") <= 0) return null;
  return isGoogleAuthoritative(email, claims.hd) ? email : null;
}

/** Verifies the RS256 signature against Google's JWKS, then the claims. */
export async function verifyIdToken(idToken: string, clientId: string, nonce: string): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const header = decodeJson<{ alg?: string; kid?: string }>(h);
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const key = await googleKey(header.kid);
  const sig = b64urlDecode(s);
  if (!key || !sig) return null;
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  const claims = decodeJson<IdTokenClaims>(p);
  return claims ? validateIdTokenClaims(claims, clientId, nonce) : null;
}
