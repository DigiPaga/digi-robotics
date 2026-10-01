import { opsDataRoute } from "@/lib/ops/http";
import { fetchOverview } from "@/lib/ops/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("overview", (options) => fetchOverview(options));
