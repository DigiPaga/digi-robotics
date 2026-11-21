import { NextResponse, type NextRequest } from "next/server";
import { buildOpsContentSecurityPolicy, createCspNonce } from "@/lib/ops/csp";

/**
 * Per-request nonce CSP for the private ops console. The policy goes on the
 * request too, because that is where Next.js reads the nonce it applies to its
 * scripts while rendering. The other ops headers are static (next.config.ts).
 */
export function proxy(request: NextRequest) {
  const policy = buildOpsContentSecurityPolicy(createCspNonce(), {
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/ops", "/ops/:path*", "/api/ops/:path*"],
};
