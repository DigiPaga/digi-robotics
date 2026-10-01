import { cookieSecure } from "@/lib/ops/config";
import { sameSecret } from "@/lib/ops/crypto";
import { authenticateRequest, isSameOrigin, opsJson, opsRedirect, requestHost } from "@/lib/ops/http";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/ops/session";

export const dynamic = "force-dynamic";

/** POST only, same-origin only, and the form must echo the session's CSRF token. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.status === "unconfigured") return opsRedirect(request, null, "/ops");
  if (!isSameOrigin(request, auth.config)) return opsJson({ message: "Cross-origin request refused." }, 403);
  if (auth.status === "authenticated") {
    const form = await request.formData().catch(() => null);
    const csrf = String(form?.get("csrf") ?? "");
    if (!(await sameSecret(csrf, auth.session.csrf))) return opsJson({ message: "Invalid CSRF token." }, 403);
  }
  const response = opsRedirect(request, auth.config, "/ops");
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(cookieSecure(request.url, requestHost(request)), 0));
  return response;
}
