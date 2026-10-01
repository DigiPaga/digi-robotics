import { opsDataRoute } from "@/lib/ops/http";
import { fetchPayments } from "@/lib/ops/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = opsDataRoute("payments", (options) => fetchPayments(options));
