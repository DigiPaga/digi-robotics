/**
 * Web Crypto helpers for the /ops session and OAuth state cookies.
 * No Node-only APIs, so the same code runs in route handlers, server
 * components and tests.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function b64urlDecode(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  try {
    const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

/** RFC 7636 S256 code challenge for a PKCE verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return b64url(new Uint8Array(digest));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Constant-time string comparison (compares SHA-256 digests, so lengths never leak). */
export async function sameSecret(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** `base64url(json).base64url(hmac)`. Integrity only: the payload is readable, never put secrets in it. */
export async function seal(secret: string, data: unknown): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify(data)));
  const mac = b64url(await hmac(secret, payload));
  return `${payload}.${mac}`;
}

export async function unseal<T>(secret: string, raw: string | undefined | null): Promise<Partial<T> | null> {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = b64url(await hmac(secret, payload));
  if (!(await sameSecret(mac, expected))) return null;
  const bytes = b64urlDecode(payload);
  if (!bytes) return null;
  try {
    const parsed: unknown = JSON.parse(decoder.decode(bytes));
    return typeof parsed === "object" && parsed !== null ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}
