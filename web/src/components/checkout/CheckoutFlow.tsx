"use client";

import Link from "next/link";
import { Check, ExternalLink, LoaderCircle, Minus, Plus, RefreshCw, ShieldCheck, Trash2, TriangleAlert, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount, useActiveWalletChain, useActiveWalletConnectionStatus, useSwitchActiveWalletChain } from "thirdweb/react";
import { z } from "zod";
import { AuthButton } from "@/components/auth/AuthButton";
import { useCart } from "@/components/cart/CartProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { primaryAction, secondaryAction } from "@/components/ui/Primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import { arbitrumSepolia as configuredCheckoutChain } from "@/lib/chains";
import { arbitrumSepolia as thirdwebCheckoutChain } from "@/lib/thirdweb";
import {
  confirmStablecoinTransaction,
  executeStablecoinPayment,
  fundDemoWallet,
  getStablecoinWallet,
  type PaymentProgress,
  type StablecoinWallet,
  type WalletProgress,
} from "@/lib/stablecoinPayment";
import { getTransactionExplorerUrl, isUsdGCompatibleSymbol } from "@/lib/network-utils";
import { recordOrderMessage } from "@/lib/orders";
import { getStablecoinConfig } from "@/lib/stablecoinConfig";
import { showError, showInfo, showSuccess, showTransactionConfirmed, showTransactionPending, showTransactionSubmitted } from "@/lib/toasts";
import { normalizeWeb3Error, type NormalizedWeb3Error } from "@/lib/web3-errors";

const shippingSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient’s full name."),
  address: z.string().trim().min(8, "Enter a complete delivery address."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  notes: z.string().trim().max(500, "Keep delivery notes under 500 characters."),
});

type Shipping = z.infer<typeof shippingSchema>;
type Confirmation = { id: string; txHash: string };
type PendingPayment = { hash: `0x${string}`; smartAccountAddress: string; confirmed: boolean };
type Activity =
  | "initializing_wallet"
  | "loading_balance"
  | "switching_network"
  | "funding"
  | "validating_balance"
  | "preparing_transfer"
  | "requesting_signature"
  | "submitted"
  | "confirming"
  | "authorizing_order"
  | "recording_order"
  | null;
type RetryAction = "wallet" | "network" | "fund" | "payment" | "record" | null;
type CheckoutError = NormalizedWeb3Error & { retryAction: RetryAction };

const fieldClass = "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[var(--page-bg)] px-4 text-[15px] text-white outline-none transition focus:border-[var(--primary)]";
const checkoutAsset = getStablecoinConfig(configuredCheckoutChain.id);
const checkoutAssetReady = isUsdGCompatibleSymbol(checkoutAsset.symbol);
const checkoutAssetLabel = checkoutAssetReady ? checkoutAsset.symbol : "USDG-compatible test asset";

function shortAddress(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function activityLabel(activity: Activity): string {
  if (activity === "initializing_wallet") return "Initializing the ZeroDev smart account";
  if (activity === "loading_balance") return `Loading the ${checkoutAssetLabel} balance`;
  if (activity === "switching_network") return `Switching to ${configuredCheckoutChain.name}`;
  if (activity === "funding") return "Waiting for the funding transaction";
  if (activity === "validating_balance") return "Validating the available balance";
  if (activity === "preparing_transfer") return "Preparing the transfer";
  if (activity === "requesting_signature") return "Waiting for wallet approval";
  if (activity === "submitted") return "Transaction submitted";
  if (activity === "confirming") return "Waiting for the transaction receipt";
  if (activity === "authorizing_order") return "Requesting order-record authorization";
  if (activity === "recording_order") return "Verifying the receipt and recording the order";
  return "Ready";
}

export function CheckoutFlow() {
  const { items, total, updateQuantity, removeItem, clearCart, isHydrated } = useCart();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const authStatus = useActiveWalletConnectionStatus();
  const switchChain = useSwitchActiveWalletChain();
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<Shipping>({ name: "", address: "", phone: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Shipping, string>>>({});
  const [wallet, setWallet] = useState<StablecoinWallet | null>(null);
  const [activity, setActivity] = useState<Activity>(null);
  const [error, setError] = useState<CheckoutError>();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string>();
  const correctChain = chain?.id === configuredCheckoutChain.id;
  const isBusy = activity !== null;

  const setFailure = useCallback((cause: unknown, retryAction: RetryAction, rejectionKind: "wallet" | "signature" = "signature") => {
    const normalized = normalizeWeb3Error(cause, {
      operation: "checkout",
      expectedNetwork: configuredCheckoutChain.name,
      assetSymbol: checkoutAssetLabel,
      rejectionKind,
    });
    setError({ ...normalized, retryAction: normalized.retryable ? retryAction : null });
    showError(normalized.message);
  }, []);

  const loadWallet = useCallback(async () => {
    if (!account || !correctChain) return;
    setError(undefined);
    try {
      const loaded = await getStablecoinWallet(account, (stage: WalletProgress) => {
        setActivity(stage === "initializing_smart_account" ? "initializing_wallet" : "loading_balance");
      });
      setWallet(loaded);
    } catch (cause) {
      setFailure(cause, "wallet");
    } finally {
      setActivity(null);
    }
  }, [account, correctChain, setFailure]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setWallet(null);
      setPendingPayment(null);
      setSubmittedHash(undefined);
      if (account && correctChain) void loadWallet();
    });
    return () => { cancelled = true; };
  }, [account, correctChain, loadWallet]);

  function validateShipping() {
    const result = shippingSchema.safeParse(shipping);
    if (result.success) {
      setFieldErrors({});
      setStep(3);
      return;
    }
    const errors: Partial<Record<keyof Shipping, string>> = {};
    for (const issue of result.error.issues) errors[issue.path[0] as keyof Shipping] = issue.message;
    setFieldErrors(errors);
  }

  async function switchExpectedNetwork() {
    setActivity("switching_network");
    setError(undefined);
    try {
      await switchChain(thirdwebCheckoutChain);
      showInfo(`Connected to ${configuredCheckoutChain.name}.`);
    } catch (cause) {
      setFailure(cause, "network", "wallet");
    } finally {
      setActivity(null);
    }
  }

  function handlePaymentProgress(stage: PaymentProgress, hash?: `0x${string}`) {
    if (stage === "preparing") setActivity("preparing_transfer");
    if (stage === "requesting_signature") {
      setActivity("requesting_signature");
      showTransactionPending();
    }
    if (stage === "submitted" && hash) {
      setActivity("submitted");
      setSubmittedHash(hash);
      showTransactionSubmitted(hash);
    }
    if (stage === "confirming") setActivity("confirming");
    if (stage === "confirmed" && hash) showTransactionConfirmed(hash);
  }

  async function fund() {
    if (!account || !correctChain) return;
    setActivity("funding");
    setError(undefined);
    try {
      await fundDemoWallet(account, handlePaymentProgress);
      showSuccess("Funding transaction confirmed.");
      await loadWallet();
    } catch (cause) {
      setFailure(cause, "fund");
    } finally {
      setActivity(null);
    }
  }

  async function recordConfirmedPayment(payment: PendingPayment) {
    if (!account) return;
    setError(undefined);
    try {
      if (!payment.confirmed) {
        setActivity("confirming");
        await confirmStablecoinTransaction(payment.hash);
        payment = { ...payment, confirmed: true };
        setPendingPayment(payment);
        showTransactionConfirmed(payment.hash);
      }
      setActivity("authorizing_order");
      const signature = await account.signMessage({ message: recordOrderMessage(account.address, payment.hash) });
      setActivity("recording_order");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          paymentAddress: payment.smartAccountAddress,
          items,
          total,
          txHash: payment.hash,
          shipping,
          signature,
        }),
      });
      const result = await response.json() as { order?: { id: string; txHash: string } };
      if (!response.ok || !result.order) {
        throw Object.assign(new Error("The confirmed payment could not be recorded yet."), { code: "ORDER_RECORDING_FAILED" });
      }
      setConfirmation(result.order);
      setPendingPayment(null);
      clearCart();
      setStep(4);
      showSuccess("Payment verified and order recorded.");
    } catch (cause) {
      const normalized = normalizeWeb3Error(cause, {
        operation: "checkout",
        expectedNetwork: configuredCheckoutChain.name,
        assetSymbol: checkoutAssetLabel,
        rejectionKind: "signature",
      });
      const message = normalized.code === "USER_REJECTED_SIGNATURE"
        ? "Payment is confirmed. The order-record signature was declined; retry recording without paying again."
        : payment.confirmed
          ? "Payment is confirmed, but the order record still needs attention. Retry recording without paying again."
          : "The submitted transaction is not confirmed yet. Recheck its receipt without sending another payment.";
      setError({ ...normalized, message, retryAction: "record" });
      showError(message);
    } finally {
      setActivity(null);
    }
  }

  async function pay() {
    if (!account || !wallet || !correctChain || isBusy) return;
    if (pendingPayment) {
      await recordConfirmedPayment(pendingPayment);
      return;
    }

    setActivity("validating_balance");
    setError(undefined);
    if (Number(wallet.balance) < Number(total)) {
      const insufficient = Object.assign(new Error(`Insufficient ${checkoutAssetLabel} balance.`), { code: "INSUFFICIENT_BALANCE" });
      setFailure(insufficient, "fund");
      setActivity(null);
      return;
    }

    let observedHash: `0x${string}` | undefined;
    try {
      const payment = await executeStablecoinPayment(account, total, (stage, hash) => {
        if (hash) observedHash = hash;
        handlePaymentProgress(stage, hash);
      });
      const confirmed: PendingPayment = { hash: payment.hash, smartAccountAddress: payment.smartAccountAddress, confirmed: true };
      setPendingPayment(confirmed);
      await recordConfirmedPayment(confirmed);
    } catch (cause) {
      if (observedHash) {
        const unresolved: PendingPayment = { hash: observedHash, smartAccountAddress: wallet.smartAccountAddress, confirmed: false };
        setPendingPayment(unresolved);
        const normalized = normalizeWeb3Error(cause, { operation: "checkout", expectedNetwork: configuredCheckoutChain.name, assetSymbol: checkoutAssetLabel });
        const message = "The transaction was submitted, but its receipt is not confirmed yet. Recheck it without sending another payment.";
        setError({ ...normalized, message, retryAction: "record" });
        showError(message);
      } else {
        setFailure(cause, "payment");
      }
    } finally {
      setActivity(null);
    }
  }

  async function retryLastAction() {
    if (!error?.retryAction) return;
    if (error.retryAction === "wallet") await loadWallet();
    if (error.retryAction === "network") await switchExpectedNetwork();
    if (error.retryAction === "fund") await fund();
    if (error.retryAction === "payment") await pay();
    if (error.retryAction === "record" && pendingPayment) await recordConfirmedPayment(pendingPayment);
  }

  if (!isHydrated) return <CheckoutLoadingState />;

  if (step !== 4 && items.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-8 text-center sm:p-12"><ShoppingEmpty /></div>;
  }

  const explorerUrl = confirmation ? getTransactionExplorerUrl(configuredCheckoutChain.id, confirmation.txHash) : undefined;

  return <div className="min-w-0">
    <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Checkout progress">
      {["Cart", "Shipping", "Wallet", "Confirmed"].map((label, index) => {
        const number = index + 1;
        return <li key={label} aria-current={number === step ? "step" : undefined} className={`min-w-0 border-t-2 pt-3 font-mono text-[9px] uppercase tracking-[.08em] sm:text-[10px] sm:tracking-[.12em] ${number <= step ? "border-[var(--primary)] text-[var(--primary)]" : "border-white/10 text-white/35"}`}><span className="hidden sm:inline">0{number} · </span>{label}</li>;
      })}
    </ol>

    {step === 1 ? <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-3">
        {items.map((item) => <article key={item.id} className="flex min-w-0 flex-col gap-5 rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><p className="break-words font-heading text-xl">{item.name}</p><p className="mt-2 font-mono text-xs text-[var(--primary)]">{item.price} {checkoutAssetLabel} each</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`} className="grid size-11 place-items-center rounded-full border border-white/15 focus-visible:border-[var(--primary)]"><Minus size={15} /></button>
            <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`} className="grid size-11 place-items-center rounded-full border border-white/15 focus-visible:border-[var(--primary)]"><Plus size={15} /></button>
            <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`} className="ml-1 grid size-11 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-[#ff9e91]"><Trash2 size={16} /></button>
          </div>
        </article>)}
      </div>
      <aside className="h-fit rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-6 lg:sticky lg:top-24">
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/45">Order total</p>
        <p className="mt-3 font-heading text-4xl">{total} <span className="text-lg text-[var(--primary)]">{checkoutAssetLabel}</span></p>
        <p className="mt-4 text-sm leading-6 text-white/50">Configured test asset on {configuredCheckoutChain.name}. No real currency is charged.</p>
        <button onClick={() => setStep(2)} className={`mt-6 min-h-12 w-full rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Continue to shipping</button>
      </aside>
    </section> : null}

    {step === 2 ? <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-9">
      <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Simulated fulfillment</p>
      <h2 className="mt-3 font-heading text-3xl">Where would this order go?</h2>
      <p className="mt-3 text-sm leading-6 text-white/50">Saved locally with the demo order. Nothing will be shipped.</p>
      <div className="mt-7 grid gap-5">
        {([['name', 'Full name', 'Ada Lovelace'], ['address', 'Delivery address', 'Street, city, postal code, country'], ['phone', 'Phone', '+65 5555 0100']] as const).map(([key, label, placeholder]) => <label key={key} className="text-sm font-medium">{label}<input value={shipping[key]} onChange={(event) => setShipping((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className={fieldClass} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `${key}-error` : undefined} />{fieldErrors[key] ? <span id={`${key}-error`} className="mt-2 block text-xs text-[#ff9e91]">{fieldErrors[key]}</span> : null}</label>)}
        <label className="text-sm font-medium">Delivery notes <span className="text-white/35">(optional)</span><textarea value={shipping.notes} onChange={(event) => setShipping((current) => ({ ...current, notes: event.target.value }))} placeholder="Access instructions or demo notes" className={`${fieldClass} min-h-28 py-3`} />{fieldErrors.notes ? <span className="mt-2 block text-xs text-[#ff9e91]">{fieldErrors.notes}</span> : null}</label>
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setStep(1)} className={`min-h-12 rounded-full border border-white/15 px-6 text-sm ${secondaryAction}`}>Back</button><button onClick={validateShipping} className={`min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Continue to wallet</button></div>
    </section> : null}

    {step === 3 ? <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-9">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]"><WalletCards size={20} /></span><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Embedded checkout wallet</p><h2 className="mt-1 font-heading text-2xl">Pay with {checkoutAssetLabel}</h2></div></div>
        {!checkoutAssetReady ? <div role="alert" className="mt-8 rounded-2xl border border-[#ffca72]/30 bg-[#ffca72]/[.05] p-6 text-sm leading-6 text-[#ffdc9f]">Checkout is safely paused until a USDG-compatible test asset is configured for {configuredCheckoutChain.name}. No payment can be submitted.</div> : (authStatus === "connecting" || (authStatus === "unknown" && !account)) ? <WalletLoadingState label="Initializing authentication" /> : !account ? <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--page-bg)] p-6"><p className="text-sm leading-6 text-white/60">Sign in with Google or email to create or restore your embedded wallet automatically.</p><AuthButton className={`mt-5 min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Connect wallet</AuthButton></div> : !correctChain ? <div className="mt-8 rounded-2xl border border-[#ffca72]/30 bg-[#ffca72]/[.05] p-6"><p className="text-sm leading-6 text-[#ffdc9f]">This checkout requires {configuredCheckoutChain.name} (chain {configuredCheckoutChain.id}). Your wallet is on chain {chain?.id ?? "unknown"}.</p><button onClick={() => void switchExpectedNetwork()} disabled={isBusy} className={`mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] disabled:opacity-50 ${primaryAction}`}>{activity === "switching_network" ? <LoaderCircle className="animate-spin" size={17} /> : null}Switch to {configuredCheckoutChain.name}</button></div> : (activity === "initializing_wallet" || activity === "loading_balance") && !error ? <WalletLoadingState label={activityLabel(activity)} /> : <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[var(--page-bg)] p-5"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">Embedded-wallet owner</p><div className="mt-2 flex min-w-0 items-center gap-2"><p className="truncate font-mono text-sm" title={account.address}>{shortAddress(account.address)}</p><CopyButton value={account.address} label="Wallet address" /></div></div>
          <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-5"><div className="flex items-start justify-between gap-5"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">ZeroDev smart account</p><div className="mt-2 flex min-w-0 items-center gap-2"><p className="truncate font-mono text-sm" title={wallet?.smartAccountAddress}>{wallet ? shortAddress(wallet.smartAccountAddress) : "Not ready"}</p>{wallet ? <CopyButton value={wallet.smartAccountAddress} label="Smart-account address" /> : null}</div></div><ShieldCheck className="shrink-0 text-[var(--primary)]" size={21} /></div><p className="mt-6 font-heading text-4xl">{wallet ? Number(wallet.balance).toFixed(2) : "—"} <span className="text-base text-[var(--primary)]">{checkoutAssetLabel}</span></p><p className="mt-2 text-xs text-white/40">Token precision is read from the configured contract: {wallet?.decimals ?? "—"} decimals</p></div>
          <button onClick={() => void fund()} disabled={isBusy || !wallet} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--primary)]/40 px-6 text-sm font-semibold text-[var(--primary)] disabled:opacity-50 ${secondaryAction}`}>{activity === "funding" || activity === "confirming" ? <LoaderCircle className="animate-spin" size={17} /> : null}Fund demo wallet</button>
          {!wallet ? <button onClick={() => void loadWallet()} disabled={isBusy} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--primary)]/40 px-6 text-sm font-semibold text-[var(--primary)] disabled:opacity-50 ${secondaryAction}`}><RefreshCw size={16} />Retry wallet setup</button> : null}
        </div>}
        {error ? <div role="alert" className="mt-6 rounded-2xl border border-[#ff7b6b]/30 bg-[#ff7b6b]/[.06] p-4"><div className="flex items-start gap-3 text-sm leading-6 text-[#ffb5ac]"><TriangleAlert className="mt-1 shrink-0" size={17} /><p className="break-words">{error.message}</p></div>{error.retryAction ? <button onClick={() => void retryLastAction()} disabled={isBusy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ffb5ac]/25 px-4 font-mono text-[10px] uppercase tracking-[.1em] text-[#ffd5d0] hover:border-[#ffb5ac]/60 disabled:opacity-50"><RefreshCw size={14} />{error.retryAction === "record" ? "Retry order record" : "Try again"}</button> : null}</div> : null}
      </div>
      <aside className="h-fit min-w-0 rounded-2xl border border-white/10 bg-[var(--surface)] p-6"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/40">Payment summary</p><p className="mt-3 font-heading text-3xl">{total} <span className="text-base text-[var(--primary)]">{checkoutAssetLabel}</span></p><p className="mt-4 text-sm leading-6 text-white/50">The configured smart account submits the transfer. Payment is complete only after a successful receipt and server verification.</p>{activity && ["validating_balance", "preparing_transfer", "requesting_signature", "submitted", "confirming", "authorizing_order", "recording_order"].includes(activity) ? <TransactionProgress label={activityLabel(activity)} hash={submittedHash} /> : null}{pendingPayment && !confirmation ? <div className="mt-5 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-4"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--primary)]">{pendingPayment.confirmed ? "Payment receipt confirmed" : "Transaction submitted · receipt pending"}</p><div className="mt-2 flex min-w-0 items-center gap-2"><span className="truncate font-mono text-xs text-white/70" title={pendingPayment.hash}>{shortAddress(pendingPayment.hash)}</span><CopyButton value={pendingPayment.hash} label="Transaction hash" /></div><p className="mt-3 text-xs leading-5 text-white/50">{pendingPayment.confirmed ? "Order recording can be retried without sending another payment." : "Recheck this receipt before any new payment attempt."}</p></div> : null}<button onClick={() => void pay()} disabled={!checkoutAssetReady || !wallet || !account || !correctChain || isBusy} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${primaryAction}`}>{isBusy ? <LoaderCircle className="animate-spin" size={17} /> : null}{isBusy ? activityLabel(activity) : pendingPayment ? (pendingPayment.confirmed ? "Record confirmed payment" : "Recheck receipt") : `Pay ${total} ${checkoutAssetLabel}`}</button><button onClick={() => setStep(2)} disabled={isBusy || Boolean(pendingPayment)} className="mt-3 min-h-11 w-full text-sm text-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">Back to shipping</button></aside>
    </section> : null}

    {step === 4 && confirmation ? <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-7 text-center sm:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--primary)] text-[var(--page-bg)]"><Check size={30} /></span><p className="mt-7 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--primary)]">Payment verified + order recorded</p><h2 className="mt-3 break-words font-heading text-4xl">Order {confirmation.id}</h2><p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/60">The {checkoutAssetLabel} transfer receipt was confirmed on {configuredCheckoutChain.name} and verified by the order service. Physical fulfillment remains simulated.</p><div className="mt-7 flex flex-wrap items-center justify-center gap-2"><CopyButton value={confirmation.txHash} label="Transaction hash" variant="standard" displayValue="Copy transaction" />{explorerUrl ? <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--primary)]/35 px-5 text-sm font-semibold text-[var(--primary)]">View transaction <ExternalLink size={15} /></a> : null}</div><div className="mt-4"><Link href="/orders" className="inline-flex min-h-11 items-center text-sm text-white/55 underline underline-offset-4 hover:text-white">View order history</Link></div></section> : null}
  </div>;
}

function CheckoutLoadingState() {
  return <div role="status" aria-label="Loading cart" className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="space-y-3">{[0, 1].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5"><Skeleton className="h-6 w-1/2" /><Skeleton className="mt-3 h-4 w-28" /><Skeleton className="mt-5 h-11 w-44" /></div>)}</div><div className="h-fit rounded-2xl border border-white/10 bg-[var(--surface)] p-6"><Skeleton className="h-3 w-24" /><Skeleton className="mt-4 h-10 w-40" /><Skeleton className="mt-5 h-12 w-full rounded-full" /></div></div>;
}

function WalletLoadingState({ label }: { label: string }) {
  return <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--page-bg)] p-5" role="status" aria-label={label}><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--primary)]">{label}</p><Skeleton className="mt-5 h-4 w-40" /><Skeleton className="mt-3 h-12 w-full" /><Skeleton className="mt-4 h-20 w-full" /></div>;
}

function TransactionProgress({ label, hash }: { label: string; hash?: string }) {
  return <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-white/10 bg-[var(--page-bg)] p-4"><div className="flex items-center gap-3"><LoaderCircle className="shrink-0 animate-spin text-[var(--primary)]" size={17} /><p className="text-sm text-white/75">{label}</p></div><Skeleton className="mt-4 h-1.5 w-full rounded-full" />{hash ? <p className="mt-3 truncate font-mono text-[10px] text-white/40" title={hash}>{hash}</p> : null}</div>;
}

function ShoppingEmpty() {
  return <><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Cart empty</p><h2 className="mt-3 font-heading text-3xl">Start with the gear catalog.</h2><p className="mt-4 text-white/50">Add any in-stock demo item, then return here to pay with the configured USDG-compatible test asset.</p><Link href="/gear" className={`mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Browse gear</Link></>;
}
