import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { getSupportedChain, getTransactionExplorerUrl } from "@/lib/network-utils";

/**
 * Deployed contract addresses and one real settled x402 purchase per supported chain, always
 * rendered server-side so a visitor sees proof of a real on-chain deployment without running the
 * interactive demo below.
 *
 * Source of truth for the addresses: `contracts/deployments/x402-421614.json` and
 * `contracts/deployments/x402-46630.json` (same MockUSDG and X402Facilitator addresses on both
 * chains — a single deployer address deployed both, see those files' `deployer` field).
 *
 * Source for the settled transactions: `x402-server/docs/AGENT_DEMO_RUNBOOK.md`
 * ("First live settlements through X402Facilitator", 0.05 mUSDG for `engine-assembly-pov`).
 * Independently re-verified on 2026-10-02 with `eth_getTransactionReceipt` against each chain's
 * public RPC (`arbitrum-sepolia-rpc.publicnode.com`, `rpc.testnet.chain.robinhood.com`): both
 * receipts return `status: "0x1"` and `to` the X402Facilitator address above.
 */
const MOCK_USDG_ADDRESS = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const X402_FACILITATOR_ADDRESS = "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816";

const PROOF_CHAINS = [
  { chainId: 421614, settledTxHash: "0xd2d5a3851db8723f65c1c441d3fa83f468443f6860b1a1ab82efe002dd521d89" },
  { chainId: 46630, settledTxHash: "0x73f27e20114467706967ae30ff3c034a34214cb5be432af4759985c861f3fc6b" },
] as const;

const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

function explorerAddressUrl(chainId: number, address: string): string | undefined {
  const explorer = getSupportedChain(chainId)?.blockExplorers?.default.url;
  return explorer ? `${explorer.replace(/\/$/, "")}/address/${address}` : undefined;
}

export function OnChainProof() {
  return (
    <section aria-labelledby="on-chain-proof-heading" className="mx-auto w-full max-w-[1500px] px-5 pb-16 sm:px-8 lg:px-12">
      <div className="rounded-[2rem] border border-white/10 bg-white/[.025] p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck className="shrink-0 text-[var(--primary)]" size={19} aria-hidden="true" />
          <h2 id="on-chain-proof-heading" className="font-heading text-xl text-white">On-chain proof</h2>
          <span className="rounded-full border border-[var(--primary)]/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Testnet</span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
          Deployed contracts and a real settled payment through the X402Facilitator on each chain, visible without running the demo below. Mock USDG is a testnet-only token with no monetary value.
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {PROOF_CHAINS.map(({ chainId, settledTxHash }) => {
            const chain = getSupportedChain(chainId);
            const explorerName = chain?.blockExplorers?.default.name ?? "Explorer";
            const chainName = chain?.name ?? `Chain ${chainId}`;
            const usdgUrl = explorerAddressUrl(chainId, MOCK_USDG_ADDRESS);
            const facilitatorUrl = explorerAddressUrl(chainId, X402_FACILITATOR_ADDRESS);
            const txUrl = getTransactionExplorerUrl(chainId, settledTxHash);
            return (
              <article key={chainId} aria-label={`${chainName} on-chain proof`} className="min-w-0 rounded-2xl border border-white/8 bg-black/15 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[.14em] text-white/45">{chainName} · testnet</p>
                <dl className="mt-4 space-y-4 font-mono text-[11px]">
                  <div>
                    <dt className="uppercase tracking-[.12em] text-white/35">MockUSDG</dt>
                    <dd className="mt-1.5 flex min-w-0 items-center gap-2 text-white/80">
                      <span className="truncate" title={MOCK_USDG_ADDRESS}>{short(MOCK_USDG_ADDRESS)}</span>
                      <CopyButton value={MOCK_USDG_ADDRESS} label={`MockUSDG address on ${chainName}`} />
                      {usdgUrl ? <a className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/15 text-[var(--primary)] hover:border-[var(--primary)]" aria-label={`Open MockUSDG on ${explorerName}`} href={usdgUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /></a> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[.12em] text-white/35">X402Facilitator</dt>
                    <dd className="mt-1.5 flex min-w-0 items-center gap-2 text-white/80">
                      <span className="truncate" title={X402_FACILITATOR_ADDRESS}>{short(X402_FACILITATOR_ADDRESS)}</span>
                      <CopyButton value={X402_FACILITATOR_ADDRESS} label={`X402Facilitator address on ${chainName}`} />
                      {facilitatorUrl ? <a className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/15 text-[var(--primary)] hover:border-[var(--primary)]" aria-label={`Open X402Facilitator on ${explorerName}`} href={facilitatorUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /></a> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[.12em] text-white/35">Settled purchase (example)</dt>
                    <dd className="mt-1.5 flex min-w-0 items-center gap-2 text-white/80">
                      <span className="truncate" title={settledTxHash}>{short(settledTxHash)}</span>
                      <CopyButton value={settledTxHash} label={`Transaction hash on ${chainName}`} />
                      {txUrl ? <a className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/15 text-[var(--primary)] hover:border-[var(--primary)]" aria-label={`Open transaction on ${explorerName}`} href={txUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /></a> : null}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
