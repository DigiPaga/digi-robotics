import { Suspense, type ReactNode } from "react";
import { ConsoleShell } from "@/components/ops/console/ConsoleShell";
import { OpsNotConfigured, OpsSignIn } from "@/components/ops/OpsPanels";
import { OpsSignInGate } from "@/components/ops/OpsSignInGate";
import { getOpsPageState } from "@/lib/ops/page-auth";

export const dynamic = "force-dynamic";

/**
 * The one persistent frame of the ops console, and its gate. The session is
 * checked here, server-side, before any section renders. Without one the
 * sections are not rendered at all: the same frame shows sign-in, or the
 * generic not-configured screen. Every section page and every /api/ops route
 * repeats the check, because a client-side navigation only re-renders the page.
 */
export default async function OpsConsoleLayout({ children }: { children: ReactNode }) {
  const state = await getOpsPageState();
  if (state.kind === "unconfigured") return <OpsNotConfigured />;
  if (state.kind === "signed-out") {
    return <Suspense fallback={<OpsSignIn />}><OpsSignInGate /></Suspense>;
  }
  return <ConsoleShell email={state.session.email} csrf={state.session.csrf}>{children}</ConsoleShell>;
}
