import "server-only";

import { NextResponse } from "next/server";
import { cookieSecure, devRequestOrigin, readOpsConfig, type OpsConfig } from "./config";
import { readCookie, sessionCookieName, sessionFromCookieValue, type OpsSession } from "./session";

/** Applied to every /ops and /api/ops response. */
export const OPS_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export function withOpsHeaders<T extends Response>(response: T): T {
  for (const [name, value] of Object.entries(OPS_RESPONSE_HEADERS)) response.headers.set(name, value);
  return response;
}

export function opsJson(body: unknown, status = 200): NextResponse {
  return withOpsHeaders(NextResponse.json(body, { status }));
}

export function requestHost(request: Request): string | null {
  return request.headers.get("host");
}

/**
 * OPS_BASE_URL when set. Otherwise the request origin, outside production
 * only: production never trusts the Host header and gets null.
 */
export function opsOrigin(request: Request, config: OpsConfig | null): string | null {
  return config?.baseUrl ?? devRequestOrigin(request.url, requestHost(request));
}

/** `path` is always one of our own absolute paths, never request input. */
export function opsRedirect(request: Request, config: OpsConfig | null, path: string, status = 303): NextResponse {
  const origin = opsOrigin(request, config);
  // No trusted origin (production, not configured): a relative Location keeps
  // the browser on the origin it actually used instead of echoing the Host header.
  if (!origin) return withOpsHeaders(new NextResponse(null, { status, headers: { Location: path } }));
  return withOpsHeaders(NextResponse.redirect(new URL(path, origin), status));
}

/**
 * CSRF guard for state-changing ops requests. A real Origin must equal ours.
 * The ops pages send `Referrer-Policy: no-referrer`, which makes browsers
 * submit same-origin form posts with `Origin: null`, so a null or missing
 * Origin falls back to Sec-Fetch-Site, a header page scripts cannot set.
 * Anything else fails.
 */
export function isSameOrigin(request: Request, config: OpsConfig): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    const expected = opsOrigin(request, config);
    return expected !== null && origin === expected;
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export type RequestAuth =
  | { status: "unconfigured" }
  | { status: "unauthenticated"; config: OpsConfig }
  | { status: "authenticated"; config: OpsConfig; session: OpsSession };

/** Server-side session check for route handlers. */
export async function authenticateRequest(request: Request, env: Record<string, string | undefined> = process.env): Promise<RequestAuth> {
  const result = readOpsConfig(env);
  if (!result.ok) return { status: "unconfigured" };
  const secure = cookieSecure(result.config, request.url, requestHost(request), env);
  const raw = readCookie(request.headers.get("cookie"), sessionCookieName(secure));
  const session = await sessionFromCookieValue(result.config, raw);
  return session
    ? { status: "authenticated", config: result.config, session }
    : { status: "unauthenticated", config: result.config };
}

/**
 * GET handler for a read-only ops data endpoint. Fails closed: the loader only
 * runs for an authenticated session. `?fresh=1` asks the loader to skip its
 * short per-isolate cache. A loader error becomes a generic 502; the cause
 * goes to the server log only.
 */
export function opsDataRoute<T>(name: string, load: (options: { fresh: boolean }) => Promise<T>) {
  return async function GET(request: Request): Promise<NextResponse> {
    const auth = await authenticateRequest(request);
    if (auth.status === "unconfigured") return opsJson({ message: "Ops is not configured." }, 503);
    if (auth.status !== "authenticated") return opsJson({ message: "Sign in required." }, 401);
    try {
      const fresh = new URL(request.url).searchParams.get("fresh") === "1";
      return opsJson(await load({ fresh }));
    } catch (error) {
      console.error(`[ops] ${name} failed: ${error instanceof Error ? error.name : "error"}`);
      return opsJson({ message: "Data could not be loaded." }, 502);
    }
  };
}
