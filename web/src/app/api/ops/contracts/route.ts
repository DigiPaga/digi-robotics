import { fetchContracts } from "@/lib/ops/contracts";
import { opsDataRoute } from "@/lib/ops/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("contracts", (options) => fetchContracts(options));
