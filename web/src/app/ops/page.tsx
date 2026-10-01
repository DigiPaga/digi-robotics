import { OpsDashboard } from "@/components/ops/OpsDashboard";
import { OpsFrame, OpsNotConfigured, OpsSignIn } from "@/components/ops/OpsPanels";
import { fetchOpsBalances } from "@/lib/ops/balances";
import { getOpsPageState } from "@/lib/ops/page-auth";

export const dynamic = "force-dynamic";

export default async function OpsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Enforced here, server-side, on every render. There is no client-only gate.
  const state = await getOpsPageState();
  if (state.kind === "unconfigured") return <OpsNotConfigured />;
  if (state.kind === "signed-out") {
    const { error } = await searchParams;
    return <OpsSignIn error={typeof error === "string" ? error : undefined} />;
  }
  const snapshot = await fetchOpsBalances();
  return (
    <OpsFrame>
      <OpsDashboard initial={snapshot} email={state.session.email} csrf={state.session.csrf} />
    </OpsFrame>
  );
}
