import { fetchOpsBalancesCached } from "@/lib/ops/balances";
import { opsDataRoute } from "@/lib/ops/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("balances", fetchOpsBalancesCached);
