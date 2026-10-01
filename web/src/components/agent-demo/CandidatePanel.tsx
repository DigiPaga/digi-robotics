import { Database, ShieldCheck } from "lucide-react";
import type { DemoCandidate } from "@/lib/agent-demo-client";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";

export function CandidatePanel({ candidates, selectedId, loading = false }: { candidates: DemoCandidate[]; selectedId?: string; loading?: boolean }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <div className="flex items-center gap-3"><Database className="text-[var(--primary)]" size={19} /><h2 className="font-heading text-xl">Candidate scan</h2></div>
      <div className="mt-5 space-y-3">
        {loading ? <div className="space-y-3" role="status" aria-label="Loading available datasets">{[0, 1].map(item => <div key={item} className="rounded-2xl border border-white/8 p-4"><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-3 h-3 w-1/2" /><Skeleton className="mt-4 h-4 w-full" /></div>)}</div> : candidates.length === 0 ? <p className="text-sm leading-6 text-white/45">Candidates appear after registry discovery completes.</p> : candidates.map(candidate => {
          const selected = candidate.id === selectedId;
          return (
            <article key={candidate.id} className={`rounded-2xl border p-4 ${selected ? "border-[var(--primary)]/40 bg-[var(--primary)]/[.07]" : "border-white/8 bg-black/10"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><p className="break-words font-medium text-white">{candidate.title}</p><p className="mt-1 break-all font-mono text-[9px] uppercase tracking-[.13em] text-white/40">{candidate.source} · score {candidate.score} · {candidate.id}</p></div>
                <div className="flex shrink-0 items-center gap-1">{selected ? <ShieldCheck className="text-[var(--primary)]" size={18} /> : null}<CopyButton value={candidate.id} label="Dataset ID" /></div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/55">{candidate.reasons.join(" · ")}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
