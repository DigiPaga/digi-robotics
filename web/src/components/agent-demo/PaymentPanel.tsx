import { ArrowUpRight, LockKeyhole, WalletCards } from "lucide-react";
import type { CompatibilityReport, DemoRun } from "@/lib/agent-demo-client";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAssetDisplayName, getNetworkDisplayName, getTransactionExplorerUrl } from "@/lib/network-utils";

const short = (value?: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";

function amountFromPrice(value?: string): string | undefined {
  return value?.match(/^\s*(\d+(?:\.\d+)?)/)?.[1];
}

export function PaymentPanel({ compatibility, run, loading = false }: { compatibility?: CompatibilityReport; run?: DemoRun; loading?: boolean }) {
  const preflight = run?.events.findLast(event => event.agentAddress);
  const paid = run?.result?.payment;
  const recipientAddress = compatibility?.seller.address ?? run?.requirements?.payTo;
  const agentAddress = compatibility?.buyer.address ?? preflight?.agentAddress;
  const configuredAmount = amountFromPrice(compatibility?.price);
  const configuredAsset = getAssetDisplayName(compatibility?.selectedAsset.symbol);
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <div className="flex items-center gap-3"><WalletCards className="text-[var(--primary)]" size={19} /><h2 className="font-heading text-xl">Payment envelope</h2></div>
      {loading ? <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2" role="status" aria-label="Loading payment configuration">{[0,1,2,3,4,5,6,7].map(item => <div key={item}><Skeleton className="h-3 w-16" /><Skeleton className="mt-2 h-4 w-full" /></div>)}</div> : <dl className="mt-6 grid grid-cols-1 gap-x-5 gap-y-5 font-mono text-[11px] sm:grid-cols-2">
        <div><dt className="uppercase tracking-[.12em] text-white/35">Network</dt><dd className="mt-1.5 break-words text-white/80">{getNetworkDisplayName(paid?.network ?? run?.requirements?.network ?? compatibility?.selectedAsset.network)}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Asset</dt><dd className="mt-1.5 text-white/80">{getAssetDisplayName(paid?.assetSymbol ?? compatibility?.selectedAsset.symbol)}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Amount</dt><dd className="mt-1.5 text-white/80">{paid ? `${paid.amount} ${getAssetDisplayName(paid.assetSymbol)}` : configuredAmount ? `${configuredAmount} ${configuredAsset}` : "—"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Pay to</dt><dd className="mt-1.5 flex min-w-0 items-center gap-2 text-white/80"><span className="truncate" title={recipientAddress}>{short(recipientAddress)}</span>{recipientAddress ? <CopyButton value={recipientAddress} label="Payment recipient" /> : null}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Agent</dt><dd className="mt-1.5 flex min-w-0 items-center gap-2 text-white/80"><span className="truncate" title={agentAddress}>{short(agentAddress)}</span>{agentAddress ? <CopyButton value={agentAddress} label="Agent address" /> : null}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Balance</dt><dd className="mt-1.5 text-white/80">{preflight?.balance ?? "checked at run"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Scheme</dt><dd className="mt-1.5 text-white/80">{run?.requirements?.scheme ?? "exact"}</dd></div>
        <div><dt className="uppercase tracking-[.12em] text-white/35">Authorization</dt><dd className="mt-1.5 text-white/80">{run?.requirements?.assetTransferMethod ?? compatibility?.selectedAsset.transferMethod ?? "—"}</dd></div>
      </dl>}
      <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/45"><LockKeyhole size={13} /> settlement receipt</p>
        {paid ? <div className="mt-3 flex min-w-0 items-center gap-2"><span className="truncate font-mono text-xs text-[var(--primary)]" title={paid.transactionHash}>{short(paid.transactionHash)}</span><CopyButton value={paid.transactionHash} label="Transaction hash" />{getTransactionExplorerUrl(paid.network, paid.transactionHash) ? <a className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/15 text-[var(--primary)] hover:border-[var(--primary)]" aria-label="Open transaction in explorer" href={getTransactionExplorerUrl(paid.network, paid.transactionHash)} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /></a> : null}</div> : <p className="mt-3 text-xs text-white/35">Not available until facilitator settlement succeeds.</p>}
      </div>
    </section>
  );
}
