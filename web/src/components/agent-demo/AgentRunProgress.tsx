import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { AgentLifecycleState } from "@/lib/agent-demo-client";

const STEPS = [
  { state: "discovering", label: "Discover" },
  { state: "dataset_selected", label: "Select" },
  { state: "payment_required", label: "Terms" },
  { state: "authorizing", label: "Authorize" },
  { state: "settling", label: "Settle" },
  { state: "confirming", label: "Verify" },
  { state: "unlocked", label: "Unlock" },
] as const;

const ACTIVE_INDEX: Record<AgentLifecycleState, number> = {
  idle: -1,
  discovering: 0,
  dataset_selected: 1,
  payment_required: 2,
  authorizing: 3,
  settling: 4,
  confirming: 5,
  unlocked: 6,
  failed: -1,
};

export function AgentRunProgress({ state }: { state: AgentLifecycleState }) {
  const activeIndex = ACTIVE_INDEX[state];
  const failed = state === "failed";

  return (
    <section aria-label="Agent run progress" className="rounded-3xl border border-white/10 bg-[#11151e] p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--primary)]">Verified run lifecycle</p>
        <p aria-live="polite" className="font-mono text-[9px] uppercase tracking-[.14em] text-white/45">{state.replaceAll("_", " ")}</p>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((step, index) => {
          const complete = !failed && activeIndex > index;
          const current = !failed && activeIndex === index;
          return (
            <li key={step.state} className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 ${current ? "border-[var(--primary)]/45 bg-[var(--primary)]/[.08] text-white" : complete ? "border-white/10 bg-white/[.035] text-white/70" : "border-white/[.07] text-white/35"}`}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current/30" aria-hidden="true">
                {failed && index === Math.max(activeIndex, 0) ? <X size={12} /> : complete ? <Check size={12} /> : current ? <LoaderCircle className="animate-spin" size={12} /> : <Circle size={9} />}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[.1em]">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
