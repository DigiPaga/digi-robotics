import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { Eyebrow, SectionTitle, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = { title: "Orders — DigiRobotics", description: "Wallet-authenticated DigiRobotics demo order history." };

export default function OrdersPage() {
  return <main className="min-h-dvh pb-24"><Navbar /><section className="py-16 sm:py-24"><div className={shell}><Eyebrow>Orders / Wallet authenticated</Eyebrow><SectionTitle className="mt-5">Your onchain receipts.</SectionTitle><p className="mt-5 max-w-2xl text-lg leading-7 text-[var(--muted-foreground)]">Order summaries are filtered by the connected owner wallet. Shipping details stay out of this view.</p><div className="mt-12"><OrderHistory /></div></div></section></main>;
}
