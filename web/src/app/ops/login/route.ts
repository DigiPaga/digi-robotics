import { cookieSecure, readOpsConfig, redirectUri } from "@/lib/ops/config";
import { pkceChallenge } from "@/lib/ops/crypto";
import { authorizeUrl } from "@/lib/ops/google";
import { opsRedirect, requestHost, withOpsHeaders } from "@/lib/ops/http";
import { newOauthState, oauthCookieName, oauthCookieOptions, sealOauthState } from "@/lib/ops/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Starts Google sign-in: state, nonce and PKCE verifier go into a short-lived sealed cookie. */
export async function GET(request: Request) {
  const result = readOpsConfig();
  if (!result.ok) return opsRedirect(request, null, "/ops", 302);
  const { config } = result;
  const host = requestHost(request);
  const oauth = newOauthState();
  const location = authorizeUrl({
    clientId: config.clientId,
    redirectUri: redirectUri(config, request.url, host),
    state: oauth.state,
    nonce: oauth.nonce,
    codeChallenge: await pkceChallenge(oauth.verifier),
  });
  const secure = cookieSecure(config, request.url, host);
  const response = withOpsHeaders(NextResponse.redirect(location, 302));
  response.cookies.set(oauthCookieName(secure), await sealOauthState(config.sessionSecret, oauth), oauthCookieOptions(secure));
  return response;
}
