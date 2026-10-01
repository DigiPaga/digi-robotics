import "server-only";

import { cookies } from "next/headers";
import { readOpsConfig } from "./config";
import { SESSION_COOKIE, sessionFromCookieValue, type OpsSession } from "./session";

export type OpsPageState =
  | { kind: "unconfigured"; problems: string[] }
  | { kind: "signed-out" }
  | { kind: "signed-in"; session: OpsSession };

/** Server-side session check for /ops pages. Fails closed on missing config. */
export async function getOpsPageState(): Promise<OpsPageState> {
  const result = readOpsConfig();
  if (!result.ok) return { kind: "unconfigured", problems: result.problems };
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await sessionFromCookieValue(result.config, raw);
  return session ? { kind: "signed-in", session } : { kind: "signed-out" };
}
