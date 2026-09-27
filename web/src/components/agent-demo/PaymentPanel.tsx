import { ArrowUpRight, LockKeyhole, WalletCards } from "lucide-react";
import type { CompatibilityReport, DemoRun } from "@/lib/agent-demo-client";

const short = (value?: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";

export function PaymentPanel({ compatibility, run }: { compatibility?: CompatibilityReport; run?: DemoRun }) {
  const preflight = run?.events.findLast(event => event.agentAddress);
  const paid = run?.result?.payment;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <div className="flex items-center gap-3"><WalletCards className="text-[var(--primary)]" size={19} /><h2 className="font-heading text-xl">Payment envelope</h2></div>
      <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 font-mono text-[11px]">
        <div><dt className="uppercase tracking-[.12em] text-white/35">Network</dt><dd className="mt-1.5 text-white/80">{run?.requirements?.network ?? compatibility?.selectedAsset.network ?? "—"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Asset</dt><dd className="mt-1.5 text-white/80">{compatibility?.selectedAsset.symbol ?? "—"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Amount</dt><dd className="mt-1.5 text-white/80">{paid ? `${paid.amount} ${paid.assetSymbol}` : compatibility?.price ?? "—"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Pay to</dt><dd className="mt-1.5 text-white/80">{short(run?.requirements?.payTo ?? compatibility?.seller.address)}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Agent</dt><dd className="mt-1.5 text-white/80">{preflight?.agentAddress ?? short(compatibility?.buyer.address)}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Balance</dt><dd className="mt-1.5 text-white/80">{preflight?.balance ?? "checked at run"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Scheme</dt><dd className="mt-1.5 text-white/80">{run?.requirements?.scheme ?? "exact"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Authorization</dt><dd className="mt-1.5 text-white/80">{run?.requirements?.assetTransferMethod ?? compatibility?.selectedAsset.transferMethod ?? "—"}</dd></div>
      </dl>
      <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/45"><LockKeyhole size={13} /> settlement receipt</p>
        {paid ? <a className="mt-3 inline-flex max-w-full items-center gap-2 break-all font-mono text-xs text-[var(--primary)] hover:underline" href={`https://sepolia.basescan.org/tx/${paid.transactionHash}`} target="_blank" rel="noreferrer">{short(paid.transactionHash)} <ArrowUpRight size={13} /></a> : <p className="mt-3 text-xs text-white/35">Not available until facilitator settlement succeeds.</p>}
      </div>
    </section>
  );
}
