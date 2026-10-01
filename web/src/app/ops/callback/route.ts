import { isAllowedEmail } from "@/lib/ops/allowlist";
import { cookieSecure, readOpsConfig, redirectUri } from "@/lib/ops/config";
import { sameSecret } from "@/lib/ops/crypto";
import { exchangeCode, verifyIdToken } from "@/lib/ops/google";
import { opsRedirect, requestHost } from "@/lib/ops/http";
import {
  OAUTH_COOKIE,
  oauthCookieOptions,
  openOauthState,
  readCookie,
  SESSION_COOKIE,
  sessionCookieOptions,
  sealSession,
} from "@/lib/ops/session";

export const dynamic = "force-dynamic";

/** Return from Google. Any doubt ends at /ops with no session and the OAuth cookie cleared. */
export async function GET(request: Request) {
  const result = readOpsConfig();
  if (!result.ok) return opsRedirect(request, null, "/ops");
  const { config } = result;
  const host = requestHost(request);
  const secure = cookieSecure(request.url, host);
  const url = new URL(request.url);

  const fail = (reason: "failed" | "denied") => {
    const response = opsRedirect(request, config, `/ops?error=${reason}`);
    response.cookies.set(OAUTH_COOKIE, "", oauthCookieOptions(secure, 0));
    return response;
  };

  const stored = await openOauthState(config.sessionSecret, readCookie(request.headers.get("cookie"), OAUTH_COOKIE));
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!stored || !code || !state || url.searchParams.has("error")) return fail("failed");
  if (!(await sameSecret(state, stored.state))) return fail("failed");

  const idToken = await exchangeCode({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: redirectUri(config, request.url, host),
    code,
    codeVerifier: stored.verifier,
  });
  if (!idToken) return fail("failed");
  const email = await verifyIdToken(idToken, config.clientId, stored.nonce);
  if (!email) return fail("failed");
  if (!isAllowedEmail(email, config.allowlist)) return fail("denied");

  const response = opsRedirect(request, config, "/ops");
  response.cookies.set(OAUTH_COOKIE, "", oauthCookieOptions(secure, 0));
  response.cookies.set(SESSION_COOKIE, await sealSession(config.sessionSecret, email), sessionCookieOptions(secure));
  return response;
}
