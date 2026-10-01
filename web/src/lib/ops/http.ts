import "server-only";

import { NextResponse } from "next/server";
import { publicOrigin, readOpsConfig, type OpsConfig } from "./config";
import { readCookie, SESSION_COOKIE, sessionFromCookieValue, type OpsSession } from "./session";

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

export function opsOrigin(request: Request, config: OpsConfig | null): string {
  return config?.baseUrl ?? publicOrigin(request.url, requestHost(request));
}

export function opsRedirect(request: Request, config: OpsConfig | null, path: string, status = 303): NextResponse {
  return withOpsHeaders(NextResponse.redirect(new URL(path, opsOrigin(request, config)), status));
}

/**
 * CSRF guard for state-changing ops requests. Browsers send Origin on POST;
 * when they do not, Sec-Fetch-Site must say same-origin. Anything else fails.
 */
export function isSameOrigin(request: Request, config: OpsConfig): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === opsOrigin(request, config);
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
  const raw = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const session = await sessionFromCookieValue(result.config, raw);
  return session
    ? { status: "authenticated", config: result.config, session }
    : { status: "unauthenticated", config: result.config };
}
