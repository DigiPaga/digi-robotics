import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Eyebrow, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Checkout — DigiRobotics",
  description: "Demo stablecoin checkout for DigiRobotics capture gear on Arbitrum Sepolia.",
  alternates: { canonical: "/checkout" },
  openGraph: {
    title: "Checkout — DigiRobotics",
    description: "Demo stablecoin checkout for DigiRobotics capture gear on Arbitrum Sepolia.",
    url: "/checkout",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkout — DigiRobotics",
    description: "Demo stablecoin checkout for DigiRobotics capture gear on Arbitrum Sepolia.",
  },
};

function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`max-w-4xl font-heading text-[clamp(2.45rem,5vw,5.4rem)] font-medium leading-[.94] tracking-[-.045em] text-[var(--foreground)] ${className}`}>{children}</h1>;
}

export default function CheckoutPage() {
  return <main className="min-h-dvh pb-24">
    <Navbar />
    <section className="py-16 sm:py-24">
      <div className={shell}>
        <Eyebrow>Stablecoin checkout / Arbitrum Sepolia</Eyebrow>
        <PageTitle className="mt-5">Gear paid onchain. Delivery demonstrated offchain.</PageTitle>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-[var(--muted-foreground)]">A human-facing counterpart to DigiRobotics’ x402 agent payments: the same programmable settlement idea, shaped as a familiar four-step checkout.</p>
        <div className="mt-12"><CheckoutFlow /></div>
      </div>
    </section>
    <Footer />
  </main>;
}
