import { cookieSecure } from "@/lib/ops/config";
import { sameSecret } from "@/lib/ops/crypto";
import { authenticateRequest, isSameOrigin, opsJson, opsRedirect, requestHost } from "@/lib/ops/http";
import { sessionCookieName, sessionCookieOptions } from "@/lib/ops/session";

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
  const secure = cookieSecure(auth.config, request.url, requestHost(request));
  response.cookies.set(sessionCookieName(secure), "", sessionCookieOptions(secure, 0));
  return response;
}
