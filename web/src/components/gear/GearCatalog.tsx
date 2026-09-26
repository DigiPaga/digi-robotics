"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Camera, Check, CircleGauge, Code2, Lightbulb, LoaderCircle, Mic2, Move3d, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { primaryAction, secondaryAction } from "@/components/ui/Primitives";
import { useCart } from "@/components/cart/CartProvider";
import { gearCategories, gearItems, type GearCategory } from "@/data/gear";

const categoryIcons: Record<GearCategory, LucideIcon> = {
  "Recording Devices": Camera,
  "Mounting & Stabilization": Move3d,
  "Audio & Communication": Mic2,
  "Motion Capture & Sensors": CircleGauge,
  "Lighting & Environment": Lightbulb,
  "Software & Processing": Code2,
};

type FormState = "idle" | "submitting" | "success" | "error";

function NotifyForm({ item }: { item: string }) {
  const id = useId();
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setState("submitting");
    setMessage("");
    const email = String(new FormData(form).get("email") ?? "");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "gear_waitlist", item }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not add you right now. Please try again.");
      setState("success");
      setMessage("You’re on this gear waitlist.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "We could not add you right now. Please try again.");
    }
  }

  return <form onSubmit={submit} className="mt-6" aria-describedby={`${id}-status`}>
    <label htmlFor={`${id}-email`} className="sr-only">Email address for {item}</label>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input id={`${id}-email`} name="email" type="email" autoComplete="email" required disabled={state === "success"} placeholder="Email address" className="min-h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-[var(--page-bg)] px-4 text-[14px] text-white placeholder:text-white/35 transition-colors duration-300 ease-out focus:border-[var(--primary)] focus:outline-none disabled:opacity-60" />
      <button disabled={state === "submitting" || state === "success"} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-4 text-[13px] font-semibold text-white disabled:cursor-default disabled:border-[var(--primary)]/40 disabled:text-[var(--primary)] ${secondaryAction}`}>
        {state === "submitting" ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
        {state === "submitting" ? "Joining…" : state === "success" ? "✓ Added" : "Notify me"}
      </button>
    </div>
    <p id={`${id}-status`} role="status" aria-live="polite" className={`mt-2 min-h-5 text-[12px] leading-5 ${state === "error" ? "text-[#ff9e91]" : "text-[var(--primary)]"}`}>{message}</p>
  </form>;
}

export function GearCatalog() {
  const [filter, setFilter] = useState<GearCategory | "All">("All");
  const [added, setAdded] = useState<string | null>(null);
  const { addItem, itemCount } = useCart();
  const visible = filter === "All" ? gearItems : gearItems.filter((item) => item.category === filter);

  return <>
    <div className="mt-10 flex flex-wrap gap-2" aria-label="Filter gear by category">
      {(["All", ...gearCategories] as const).map((category) => <button key={category} onClick={() => setFilter(category)} aria-pressed={filter === category} className={`min-h-11 rounded-full border px-4 text-[13px] font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 ${filter === category ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--page-bg)]" : "border-white/15 text-white/70 hover:border-[var(--primary)]/50 hover:bg-white/5 hover:text-white"}`}>{category}</button>)}
    </div>
    <p className="mt-5 font-mono text-[11px] uppercase tracking-[.14em] text-white/45">Showing {visible.length} items</p>
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((item) => {
        const Icon = categoryIcons[item.category];
        return <article key={item.name} className="group flex min-h-full flex-col rounded-2xl border border-white/[.09] bg-[var(--surface)] p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 focus-within:border-[var(--primary)]/30 sm:p-6">
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/20 bg-[var(--page-bg)] text-center">
            <div><Icon aria-hidden="true" className="mx-auto text-[var(--primary)]" size={30} /><p className="mt-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/45">Product imagery coming soon</p></div>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/45">{item.category}</p><span className="shrink-0 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/[.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-[var(--primary)]">{item.price ? "In stock" : "Coming soon"}</span></div>
          <h2 className="mt-4 font-heading text-[22px] leading-[1.08] transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{item.name}</h2>
          <p className="mt-3 flex-1 text-[15px] leading-6 text-[var(--muted-foreground)]">{item.description}</p>
          {item.price ? <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[.08] pt-5">
            <div><p className="font-heading text-xl">{item.price} <span className="font-mono text-[10px] text-white/45">mUSDG</span></p><p className="mt-1 text-[11px] text-white/40">Demo price</p></div>
            <button onClick={() => { addItem({ id: item.id, name: item.name, price: item.price! }); setAdded(item.id); window.setTimeout(() => setAdded(null), 1200); }} className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--page-bg)] ${primaryAction}`}>
              {added === item.id ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}{added === item.id ? "Added" : "Add to cart"}
            </button>
          </div> : <NotifyForm item={item.name} />}
        </article>;
      })}
    </div>
    {itemCount > 0 ? <Link href="/checkout" className={`fixed bottom-20 right-5 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-[13px] font-semibold text-[var(--page-bg)] shadow-2xl sm:right-8 ${primaryAction}`}><ShoppingCart size={17} aria-hidden="true" />Checkout · {itemCount}</Link> : null}
  </>;
}
