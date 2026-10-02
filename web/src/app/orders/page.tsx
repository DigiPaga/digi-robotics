import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { Eyebrow, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Orders — DigiRobotics",
  description: "Wallet-authenticated DigiRobotics demo order history.",
  alternates: { canonical: "/orders" },
  openGraph: {
    title: "Orders — DigiRobotics",
    description: "Wallet-authenticated DigiRobotics demo order history.",
    url: "/orders",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orders — DigiRobotics",
    description: "Wallet-authenticated DigiRobotics demo order history.",
  },
};

function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`max-w-4xl font-heading text-[clamp(2.45rem,5vw,5.4rem)] font-medium leading-[.94] tracking-[-.045em] text-[var(--foreground)] ${className}`}>{children}</h1>;
}

export default function OrdersPage() {
  return <main className="min-h-dvh pb-24"><Navbar /><section className="py-16 sm:py-24"><div className={shell}><Eyebrow>Orders / Wallet authenticated</Eyebrow><PageTitle className="mt-5">Your onchain receipts.</PageTitle><p className="mt-5 max-w-2xl text-lg leading-7 text-[var(--muted-foreground)]">Order summaries are filtered by the connected owner wallet. Shipping details stay out of this view.</p><div className="mt-12"><OrderHistory /></div></div></section><Footer /></main>;
}
