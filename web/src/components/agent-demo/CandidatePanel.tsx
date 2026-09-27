import { Database, ShieldCheck } from "lucide-react";
import type { DemoCandidate } from "@/lib/agent-demo-client";

export function CandidatePanel({ candidates, selectedId }: { candidates: DemoCandidate[]; selectedId?: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <div className="flex items-center gap-3"><Database className="text-[var(--primary)]" size={19} /><h2 className="font-heading text-xl">Candidate scan</h2></div>
      <div className="mt-5 space-y-3">
        {candidates.length === 0 ? <p className="text-sm leading-6 text-white/45">Candidates appear after Bazaar and local registry discovery completes.</p> : candidates.map(candidate => {
          const selected = candidate.id === selectedId;
          return (
            <article key={candidate.id} className={`rounded-2xl border p-4 ${selected ? "border-[var(--primary)]/40 bg-[var(--primary)]/[.07]" : "border-white/8 bg-black/10"}`}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="font-medium text-white">{candidate.title}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[.13em] text-white/40">{candidate.source} · score {candidate.score}</p></div>
                {selected ? <ShieldCheck className="shrink-0 text-[var(--primary)]" size={18} /> : null}
              </div>
              <p className="mt-3 text-xs leading-5 text-white/55">{candidate.reasons.join(" · ")}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
