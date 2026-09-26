import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Navbar } from "@/components/landing/Navbar";
import { Eyebrow, SectionTitle, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Checkout — DigiRobotics",
  description: "Demo stablecoin checkout for DigiRobotics capture gear on Arbitrum Sepolia.",
};

export default function CheckoutPage() {
  return <main className="min-h-dvh pb-24">
    <Navbar />
    <section className="py-16 sm:py-24">
      <div className={shell}>
        <Eyebrow>Stablecoin checkout / Arbitrum Sepolia</Eyebrow>
        <SectionTitle className="mt-5">Gear paid onchain. Delivery demonstrated offchain.</SectionTitle>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-[var(--muted-foreground)]">A human-facing counterpart to DigiRobotics’ x402 agent payments: the same programmable settlement idea, shaped as a familiar four-step checkout.</p>
        <div className="mt-12"><CheckoutFlow /></div>
      </div>
    </section>
  </main>;
}
