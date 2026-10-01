import { fetchOpsBalances } from "@/lib/ops/balances";
import { authenticateRequest, opsJson } from "@/lib/ops/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.status === "unconfigured") return opsJson({ message: "Ops is not configured." }, 503);
  if (auth.status !== "authenticated") return opsJson({ message: "Sign in required." }, 401);
  try {
    return opsJson(await fetchOpsBalances());
  } catch {
    return opsJson({ message: "Balances could not be loaded." }, 502);
  }
}
