"use client";

import Link from "next/link";
import { Check, ExternalLink, LoaderCircle, Minus, Plus, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { useCallback, useState } from "react";
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from "thirdweb/react";
import { z } from "zod";
import { AuthButton } from "@/components/auth/AuthButton";
import { useCart } from "@/components/cart/CartProvider";
import { primaryAction, secondaryAction } from "@/components/ui/Primitives";
import { arbitrumSepolia } from "@/lib/thirdweb";
import { executeStablecoinPayment, fundDemoWallet, getStablecoinWallet, type StablecoinWallet } from "@/lib/stablecoinPayment";
import { recordOrderMessage } from "@/lib/orders";

const shippingSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient’s full name."),
  address: z.string().trim().min(8, "Enter a complete delivery address."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  notes: z.string().trim().max(500, "Keep delivery notes under 500 characters."),
});

type Shipping = z.infer<typeof shippingSchema>;
type Confirmation = { id: string; txHash: string };
type Busy = "wallet" | "faucet" | "payment" | null;

const fieldClass = "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[var(--page-bg)] px-4 text-[15px] text-white outline-none transition focus:border-[var(--primary)]";

function shortAddress(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

export function CheckoutFlow() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<Shipping>({ name: "", address: "", phone: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Shipping, string>>>({});
  const [wallet, setWallet] = useState<StablecoinWallet | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const correctChain = chain?.id === 421614;

  const loadWallet = useCallback(async () => {
    if (!account || !correctChain) return;
    setBusy("wallet");
    setError("");
    try {
      setWallet(await getStablecoinWallet(account));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the demo wallet.");
    } finally {
      setBusy(null);
    }
  }, [account, correctChain]);

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

  async function fund() {
    if (!account) return;
    setBusy("faucet");
    setError("");
    try {
      await fundDemoWallet(account);
      setWallet(await getStablecoinWallet(account));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The faucet transaction failed.");
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (!account || !wallet) return;
    if (Number(wallet.balance) < Number(total)) {
      setError("Your smart account needs more mUSDG. Use Fund Wallet, then try again.");
      return;
    }
    setBusy("payment");
    setError("");
    try {
      const payment = await executeStablecoinPayment(account, total);
      const signature = await account.signMessage({ message: recordOrderMessage(account.address, payment.hash) });
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
      const result = await response.json() as { order?: { id: string; txHash: string }; message?: string };
      if (!response.ok || !result.order) throw new Error(result.message || "Payment succeeded, but the order could not be recorded.");
      setConfirmation(result.order);
      clearCart();
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed. Your cart is still intact.");
    } finally {
      setBusy(null);
    }
  }

  if (step !== 4 && items.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-8 text-center sm:p-12">
      <ShoppingEmpty />
    </div>;
  }

  return <div>
    <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Checkout progress">
      {["Cart", "Shipping", "Wallet", "Confirmed"].map((label, index) => {
        const number = index + 1;
        return <li key={label} className={`border-t-2 pt-3 font-mono text-[10px] uppercase tracking-[.12em] ${number <= step ? "border-[var(--primary)] text-[var(--primary)]" : "border-white/10 text-white/35"}`}><span className="hidden sm:inline">0{number} · </span>{label}</li>;
      })}
    </ol>

    {step === 1 ? <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {items.map((item) => <article key={item.id} className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><p className="font-heading text-xl">{item.name}</p><p className="mt-2 font-mono text-xs text-[var(--primary)]">{item.price} mUSDG each</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`} className="grid size-10 place-items-center rounded-full border border-white/15"><Minus size={15} /></button>
            <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`} className="grid size-10 place-items-center rounded-full border border-white/15"><Plus size={15} /></button>
            <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`} className="ml-2 grid size-10 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-[#ff9e91]"><Trash2 size={16} /></button>
          </div>
        </article>)}
      </div>
      <aside className="h-fit rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-6 lg:sticky lg:top-24">
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/45">Order total</p>
        <p className="mt-3 font-heading text-4xl">{total} <span className="text-lg text-[var(--primary)]">mUSDG</span></p>
        <p className="mt-4 text-sm leading-6 text-white/50">Six-decimal demo stablecoin on Arbitrum Sepolia. No real currency is charged.</p>
        <button onClick={() => setStep(2)} className={`mt-6 min-h-12 w-full rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Continue to shipping</button>
      </aside>
    </section> : null}

    {step === 2 ? <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-9">
      <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Simulated fulfillment</p>
      <h2 className="mt-3 font-heading text-3xl">Where would this order go?</h2>
      <p className="mt-3 text-sm leading-6 text-white/50">Saved locally with the demo order. Nothing will be shipped.</p>
      <div className="mt-7 grid gap-5">
        {([['name', 'Full name', 'Ada Lovelace'], ['address', 'Delivery address', 'Street, city, postal code, country'], ['phone', 'Phone', '+65 5555 0100']] as const).map(([key, label, placeholder]) => <label key={key} className="text-sm font-medium">{label}<input value={shipping[key]} onChange={(event) => setShipping((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className={fieldClass} aria-invalid={Boolean(fieldErrors[key])} />{fieldErrors[key] ? <span className="mt-2 block text-xs text-[#ff9e91]">{fieldErrors[key]}</span> : null}</label>)}
        <label className="text-sm font-medium">Delivery notes <span className="text-white/35">(optional)</span><textarea value={shipping.notes} onChange={(event) => setShipping((current) => ({ ...current, notes: event.target.value }))} placeholder="Access instructions or demo notes" className={`${fieldClass} min-h-28 py-3`} />{fieldErrors.notes ? <span className="mt-2 block text-xs text-[#ff9e91]">{fieldErrors.notes}</span> : null}</label>
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setStep(1)} className={`min-h-12 rounded-full border border-white/15 px-6 text-sm ${secondaryAction}`}>Back</button><button onClick={validateShipping} className={`min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Continue to wallet</button></div>
    </section> : null}

    {step === 3 ? <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-9">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]"><WalletCards size={20} /></span><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Embedded checkout wallet</p><h2 className="mt-1 font-heading text-2xl">Pay with mUSDG</h2></div></div>
        {!account ? <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--page-bg)] p-6"><p className="text-sm leading-6 text-white/60">Sign in with Google or email to create or restore your Thirdweb embedded wallet.</p><AuthButton className={`mt-5 min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Connect wallet</AuthButton></div> : !correctChain ? <div className="mt-8 rounded-2xl border border-[#ffca72]/30 bg-[#ffca72]/[.05] p-6"><p className="text-sm leading-6 text-[#ffdc9f]">This checkout runs only on Arbitrum Sepolia (chain 421614). Your wallet is on chain {chain?.id ?? "unknown"}.</p><button onClick={() => void switchChain(arbitrumSepolia)} className={`mt-5 min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Switch to Arbitrum Sepolia</button></div> : <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[var(--page-bg)] p-5"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">Thirdweb owner</p><p className="mt-2 font-mono text-sm">{shortAddress(account.address)}</p></div>
          <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-5"><div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">ZeroDev smart account</p><p className="mt-2 font-mono text-sm">{wallet ? shortAddress(wallet.smartAccountAddress) : "Deriving…"}</p></div><ShieldCheck className="text-[var(--primary)]" size={21} /></div><p className="mt-6 font-heading text-4xl">{wallet ? Number(wallet.balance).toFixed(2) : "—"} <span className="text-base text-[var(--primary)]">mUSDG</span></p><p className="mt-2 text-xs text-white/40">Decimals read from the deployed token contract: {wallet?.decimals ?? "—"}</p></div>
          <button onClick={() => void fund()} disabled={Boolean(busy)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--primary)]/40 px-6 text-sm font-semibold text-[var(--primary)] disabled:opacity-50 ${secondaryAction}`}>{busy === "faucet" ? <LoaderCircle className="animate-spin" size={17} /> : null}Fund wallet · +1,000 mUSDG</button>
          {!wallet && busy !== "wallet" ? <button onClick={() => void loadWallet()} className={`inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--primary)]/40 px-6 text-sm font-semibold text-[var(--primary)] ${secondaryAction}`}>Prepare demo wallet</button> : null}
        </div>}
        {busy === "wallet" ? <p className="mt-6 flex items-center gap-2 text-sm text-white/50"><LoaderCircle className="animate-spin" size={16} />Preparing smart account…</p> : null}
        {error ? <div role="alert" className="mt-6 rounded-xl border border-[#ff7b6b]/30 bg-[#ff7b6b]/[.06] p-4 text-sm leading-6 text-[#ffb5ac]">{error}</div> : null}
      </div>
      <aside className="h-fit rounded-2xl border border-white/10 bg-[var(--surface)] p-6"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/40">Payment summary</p><p className="mt-3 font-heading text-3xl">{total} <span className="text-base text-[var(--primary)]">mUSDG</span></p><p className="mt-4 text-sm leading-6 text-white/50">A direct ERC-20 transfer goes from your ZeroDev smart account to the verified store wallet. ZeroDev sponsors the gas.</p><button onClick={() => void pay()} disabled={!wallet || !account || !correctChain || Boolean(busy)} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${primaryAction}`}>{busy === "payment" ? <LoaderCircle className="animate-spin" size={17} /> : null}{busy === "payment" ? "Confirming onchain…" : `Pay ${total} mUSDG`}</button><button onClick={() => setStep(2)} disabled={Boolean(busy)} className="mt-3 min-h-11 w-full text-sm text-white/50 hover:text-white">Back to shipping</button></aside>
    </section> : null}

    {step === 4 && confirmation ? <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-7 text-center sm:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--primary)] text-[var(--page-bg)]"><Check size={30} /></span><p className="mt-7 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--primary)]">Payment confirmed</p><h2 className="mt-3 font-heading text-4xl">Order {confirmation.id}</h2><p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/60">Your mUSDG transfer is final on Arbitrum Sepolia. Physical fulfillment is simulated for this hackathon demo; no package will be shipped.</p><a href={`https://sepolia.arbiscan.io/tx/${confirmation.txHash}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--primary)]/35 px-6 text-sm font-semibold text-[var(--primary)]">View transaction <ExternalLink size={15} /></a><div className="mt-4"><Link href="/orders" className="text-sm text-white/55 underline underline-offset-4 hover:text-white">View order history</Link></div></section> : null}
  </div>;
}

function ShoppingEmpty() {
  return <><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">Cart empty</p><h2 className="mt-3 font-heading text-3xl">Start with the gear catalog.</h2><p className="mt-4 text-white/50">Add any in-stock demo item, then return here to pay with mUSDG.</p><Link href="/gear" className={`mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Browse gear</Link></>;
}
