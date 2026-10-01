import { opsDataRoute } from "@/lib/ops/http";
import { fetchMarketplace } from "@/lib/ops/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("marketplace", (options) => fetchMarketplace(options));
