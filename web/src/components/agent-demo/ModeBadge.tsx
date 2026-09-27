import { CircleCheck, ShieldAlert } from "lucide-react";
import type { DemoMode } from "@/lib/agent-demo-client";

const label: Record<DemoMode, string> = {
  REAL_MUSDG_X402: "REAL MUSDG X402",
  REAL_X402_TEST_ASSET: "REAL X402 — TEST USDC",
  BLOCKED: "BLOCKED",
};

export function ModeBadge({ mode }: { mode: DemoMode }) {
  const blocked = mode === "BLOCKED";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] font-semibold tracking-[.14em] ${blocked ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-[var(--primary)]/35 bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
      {blocked ? <ShieldAlert size={13} /> : <CircleCheck size={13} />}
      {label[mode]}
    </span>
  );
}
