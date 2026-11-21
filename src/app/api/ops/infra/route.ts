import { opsDataRoute } from "@/lib/ops/http";
import { fetchInfra } from "@/lib/ops/infra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("infra", (options) => fetchInfra(options));
