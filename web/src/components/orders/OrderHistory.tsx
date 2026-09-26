"use client";

import { ExternalLink, LoaderCircle, PackageCheck } from "lucide-react";
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { AuthButton } from "@/components/auth/AuthButton";
import { primaryAction } from "@/components/ui/Primitives";
import { orderHistoryMessage, type OrderSummary } from "@/lib/orders";

export function OrderHistory() {
  const account = useActiveAccount();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadOrders() {
    if (!account) return;
    setLoading(true);
    setError("");
    try {
      const signature = await account.signMessage({ message: orderHistoryMessage(account.address) });
      const response = await fetch("/api/orders", { headers: { "x-wallet-address": account.address, "x-wallet-signature": signature } });
      const result = await response.json() as { orders?: OrderSummary[]; message?: string };
      if (!response.ok || !result.orders) throw new Error(result.message || "Unable to load orders.");
      setOrders(result.orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  if (!account) return <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-8 text-center"><p className="text-white/55">Connect the wallet that placed your order.</p><AuthButton className={`mt-6 min-h-12 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}>Connect wallet</AuthButton></div>;

  if (orders === null) return <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-8 text-center"><PackageCheck className="mx-auto text-[var(--primary)]" size={30} /><p className="mt-5 text-white/60">Sign a read-only message to prove this wallet owns the requested history.</p><button onClick={() => void loadOrders()} disabled={loading} className={`mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] disabled:opacity-50 ${primaryAction}`}>{loading ? <LoaderCircle className="animate-spin" size={16} /> : null}{loading ? "Authenticating…" : "Load my orders"}</button>{error ? <p className="mt-4 text-sm text-[#ffb5ac]">{error}</p> : null}</div>;

  if (orders.length === 0) return <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-8 text-center text-white/55">No demo orders found for this wallet.</div>;

  return <div className="space-y-4">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">{order.status}</p><h2 className="mt-2 font-heading text-2xl">{order.id}</h2><p className="mt-2 text-sm text-white/40">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</p></div><p className="font-heading text-2xl">{order.total} <span className="text-sm text-[var(--primary)]">mUSDG</span></p></div><ul className="mt-6 border-t border-white/[.08] pt-5 text-sm text-white/60">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-1"><span>{item.quantity} × {item.name}</span><span className="font-mono text-xs">{item.price}</span></li>)}</ul><a href={`https://sepolia.arbiscan.io/tx/${order.txHash}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-mono text-xs text-[var(--primary)] hover:underline">{order.txHash.slice(0, 12)}…{order.txHash.slice(-8)} <ExternalLink size={13} /></a></article>)}</div>;
}
