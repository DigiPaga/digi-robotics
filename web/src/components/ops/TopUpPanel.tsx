"use client";

import { CheckCircle2, ExternalLink, LoaderCircle, Plug, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, getAddress, http, type Address, type Hash } from "viem";
import { Eyebrow, primaryAction, secondaryAction } from "@/components/ui/Primitives";
import { explorerTxUrl, getOpsChain, OPS_CHAINS } from "@/lib/ops/chains";
import {
  describeTopUpError,
  ensureTopUpChain,
  parseTopUpAmount,
  readChainId,
  TOPUP_PRESETS,
  type Eip1193Provider,
  type Eip6963ProviderDetail,
} from "@/lib/ops/topup";
import type { OpsWallet } from "@/lib/ops/wallets";
import {
  showError,
  showTransactionConfirmed,
  showTransactionPending,
  showTransactionSubmitted,
  showWalletConnected,
} from "@/lib/toasts";

export interface TopUpTarget {
  address: string;
  chainId: number;
}

type Status =
  | { kind: "idle" }
  | { kind: "switching" }
  | { kind: "awaiting" }
  | { kind: "pending"; hash: Hash; chainId: number }
  | { kind: "confirmed"; hash: Hash; chainId: number }
  | { kind: "error"; message: string };

interface InjectedOption {
  id: string;
  name: string;
  provider: Eip1193Provider;
}

function noopSubscribe(): () => void {
  return () => undefined;
}

function readLegacyProvider(): Eip1193Provider | null {
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

/** EIP-6963 discovery, with window.ethereum as the fallback for older wallets. */
function useInjectedProviders(): InjectedOption[] {
  const [announced, setAnnounced] = useState<InjectedOption[]>([]);
  const legacy = useSyncExternalStore(noopSubscribe, readLegacyProvider, () => null);

  useEffect(() => {
    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (!detail?.info?.uuid || !detail.provider) return;
      setAnnounced((current) => current.some((item) => item.id === detail.info.uuid)
        ? current
        : [...current, { id: detail.info.uuid, name: detail.info.name, provider: detail.provider }]);
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  if (announced.length > 0) return announced;
  return legacy ? [{ id: "injected", name: "Browser wallet", provider: legacy }] : [];
}

const inputClass = "min-h-11 w-full rounded-2xl border border-white/15 bg-[var(--page-bg)] px-4 text-sm text-white outline-none transition focus:border-[var(--primary)]/60";

export function TopUpPanel({
  wallets,
  target,
  onTargetChange,
  onConfirmed,
}: {
  wallets: OpsWallet[];
  target: TopUpTarget;
  onTargetChange: (target: TopUpTarget) => void;
  onConfirmed: () => Promise<void> | void;
}) {
  const providers = useInjectedProviders();
  const [providerId, setProviderId] = useState<string>("");
  const [account, setAccount] = useState<Address | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [balanceState, setBalanceState] = useState<{ key: string; value: bigint | null } | null>(null);
  const [balanceNonce, setBalanceNonce] = useState(0);
  const [amount, setAmount] = useState<string>(TOPUP_PRESETS[1]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const selected = providers.find((item) => item.id === providerId) ?? providers[0] ?? null;
  const chain = getOpsChain(target.chainId);
  const busy = status.kind === "switching" || status.kind === "awaiting" || status.kind === "pending";
  const publicClient = useMemo(
    () => (chain ? createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) }) : null),
    [chain],
  );

  const balanceKey = account ? `${account}:${target.chainId}` : "";
  const balance = balanceState && balanceState.key === balanceKey ? balanceState.value : null;

  useEffect(() => {
    if (!account || !publicClient) return;
    let cancelled = false;
    const key = `${account}:${publicClient.chain.id}`;
    publicClient.getBalance({ address: account }).then(
      (value) => { if (!cancelled) setBalanceState({ key, value }); },
      () => { if (!cancelled) setBalanceState({ key, value: null }); },
    );
    return () => { cancelled = true; };
  }, [account, publicClient, balanceNonce]);

  useEffect(() => {
    const provider = selected?.provider;
    if (!provider?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const list = args[0];
      setAccount(Array.isArray(list) && typeof list[0] === "string" ? getAddress(list[0]) : null);
    };
    const onChain = (...args: unknown[]) => {
      const raw = args[0];
      setWalletChainId(typeof raw === "string" ? Number.parseInt(raw, 16) : null);
    };
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [selected]);

  async function connect() {
    if (!selected) return;
    try {
      const accounts = (await selected.provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.[0]) throw new Error("The wallet returned no account.");
      const address = getAddress(accounts[0]);
      setAccount(address);
      setWalletChainId(await readChainId(selected.provider));
      showWalletConnected(address);
    } catch (error) {
      const message = describeTopUpError(error);
      setStatus({ kind: "error", message });
      showError(message);
    }
  }

  async function send() {
    if (!selected || !account || !chain || !publicClient) return;
    let value: bigint;
    try {
      value = parseTopUpAmount(amount);
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
      return;
    }
    const to = wallets.find((wallet) => wallet.address === target.address)?.address;
    if (!to) {
      setStatus({ kind: "error", message: "Pick a destination wallet from the list." });
      return;
    }
    if (balance !== null && balance < value) {
      setStatus({ kind: "error", message: "The connected wallet does not have enough ETH for this amount plus gas." });
      return;
    }
    try {
      setStatus({ kind: "switching" });
      const verified = await ensureTopUpChain(selected.provider, chain.id);
      setWalletChainId(verified.id);
      setStatus({ kind: "awaiting" });
      showTransactionPending();
      const walletClient = createWalletClient({ account, chain: verified, transport: custom(selected.provider) });
      const hash = await walletClient.sendTransaction({ account, chain: verified, to, value });
      setStatus({ kind: "pending", hash, chainId: verified.id });
      showTransactionSubmitted(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
      if (receipt.status !== "success") throw new Error("The transfer reverted.");
      setStatus({ kind: "confirmed", hash, chainId: verified.id });
      showTransactionConfirmed(hash);
      setBalanceNonce((nonce) => nonce + 1);
      await onConfirmed();
    } catch (error) {
      const message = describeTopUpError(error);
      setStatus({ kind: "error", message });
      showError(message);
    }
  }

  const statusChain = status.kind === "pending" || status.kind === "confirmed" ? getOpsChain(status.chainId) : null;
  const wrongChain = account && walletChainId !== null && chain && walletChainId !== chain.id;

  return (
    <section id="top-up" className="scroll-mt-8 rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-8">
      <Eyebrow>Ops / Top up</Eyebrow>
      <h2 className="mt-3 font-heading text-3xl font-medium tracking-[-.02em]">Send testnet ETH</h2>
      <p className="mt-2 max-w-2xl text-base text-[var(--muted-foreground)]">
        Plain ETH transfer from your browser wallet. Only Arbitrum Sepolia and Robinhood Chain Testnet are allowed. Keys stay in your wallet.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {providers.length === 0 ? (
            <p className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/60">No browser wallet found. Install Rabby or MetaMask and reload.</p>
          ) : (
            <>
              {providers.length > 1 ? (
                <label className="block text-sm text-white/60">
                  Wallet
                  <select className={`${inputClass} mt-2`} value={selected?.id ?? ""} onChange={(event) => { setProviderId(event.target.value); setAccount(null); }}>
                    {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              ) : null}
              {account ? (
                <div className="rounded-2xl border border-white/10 px-4 py-3">
                  <p className="flex items-center gap-2 font-mono text-xs text-white/70"><Wallet size={14} aria-hidden="true" /> {account}</p>
                  <p className="mt-2 text-sm text-white/60">
                    {balance === null ? "Balance unavailable" : `${Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`} on {chain?.name}
                  </p>
                  {wrongChain ? <p className="mt-1 text-xs text-[#f5d38a]">Wallet is on chain {walletChainId}. It will be asked to switch.</p> : null}
                </div>
              ) : (
                <button type="button" onClick={() => void connect()} className={`inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold ${secondaryAction}`}>
                  <Plug size={16} aria-hidden="true" /> Connect {selected?.name ?? "wallet"}
                </button>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-white/60">
              To
              <select className={`${inputClass} mt-2`} value={target.address} onChange={(event) => onTargetChange({ ...target, address: event.target.value })}>
                {wallets.map((wallet) => <option key={wallet.address} value={wallet.address}>{wallet.label} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</option>)}
              </select>
            </label>
            <label className="block text-sm text-white/60">
              Network
              <select className={`${inputClass} mt-2`} value={target.chainId} onChange={(event) => onTargetChange({ ...target, chainId: Number(event.target.value) })}>
                {OPS_CHAINS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm text-white/60">
            Amount (ETH)
            <input className={`${inputClass} mt-2 font-mono`} inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                aria-pressed={amount === preset}
                className={`min-h-9 rounded-full border px-4 font-mono text-xs transition ${amount === preset ? "border-[var(--primary)] text-[var(--primary)]" : "border-white/15 text-white/60 hover:border-white/40"}`}
              >
                {preset}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!account || busy}
            className={`inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-50 ${primaryAction}`}
          >
            {busy ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
            {status.kind === "switching" ? "Switching network…" : status.kind === "awaiting" ? "Confirm in wallet…" : status.kind === "pending" ? "Waiting for confirmation…" : "Send"}
          </button>

          <div aria-live="polite">
            {status.kind === "error" ? <p role="alert" className="text-sm text-[#ffb5ac]">{status.message}</p> : null}
            {(status.kind === "pending" || status.kind === "confirmed") && statusChain ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                {status.kind === "confirmed" ? <CheckCircle2 size={15} className="text-[var(--primary)]" aria-hidden="true" /> : <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
                {status.kind === "confirmed" ? "Confirmed" : "Pending"}
                <a href={explorerTxUrl(statusChain, status.hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline">
                  {status.hash.slice(0, 10)}…{status.hash.slice(-8)} <ExternalLink size={12} aria-hidden="true" />
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
