import "server-only";

import { cookies, headers } from "next/headers";
import { cookieSecure, readOpsConfig } from "./config";
import { sessionCookieName, sessionFromCookieValue, type OpsSession } from "./session";

export type OpsPageState =
  | { kind: "unconfigured" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; session: OpsSession };

let lastReported = "";

/**
 * The problem list names env variables, so it goes to the server log and never
 * into the response. Logged once per distinct list, not once per request.
 */
function reportProblems(problems: readonly string[]): void {
  const summary = problems.join("; ");
  if (summary === lastReported) return;
  lastReported = summary;
  console.error(`[ops] not configured: ${summary}`);
}

/** Server-side session check for /ops pages. Fails closed on missing config. */
export async function getOpsPageState(): Promise<OpsPageState> {
  const result = readOpsConfig();
  if (!result.ok) {
    reportProblems(result.problems);
    return { kind: "unconfigured" };
  }
  lastReported = "";
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  // Only consulted in development without OPS_BASE_URL; see cookieSecure.
  const proto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ? "https" : "http";
  const secure = cookieSecure(result.config, `${proto}://localhost`, requestHeaders.get("host"));
  const raw = jar.get(sessionCookieName(secure))?.value;
  const session = await sessionFromCookieValue(result.config, raw);
  return session ? { kind: "signed-in", session } : { kind: "signed-out" };
}
