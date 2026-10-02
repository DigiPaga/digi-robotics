import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GearCatalog } from "@/components/gear/GearCatalog";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Eyebrow, inlineLink, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Capture Gear — DigiRobotics",
  description: "Explore upcoming capture devices, mounts, audio, sensors, lighting, and processing tools for DigiRobotics campaigns.",
  alternates: { canonical: "/gear" },
  openGraph: {
    title: "Capture Gear — DigiRobotics",
    description: "Order demo capture gear with mUSDG on Arbitrum Sepolia, or join the waitlist for equipment still in evaluation.",
    url: "/gear",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capture Gear — DigiRobotics",
    description: "Order demo capture gear with mUSDG on Arbitrum Sepolia, or join the waitlist for equipment still in evaluation.",
  },
};

function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`max-w-4xl font-heading text-[clamp(2.45rem,5vw,5.4rem)] font-medium leading-[.94] tracking-[-.045em] text-[var(--foreground)] ${className}`}>{children}</h1>;
}

export default function GearPage() {
  return <main className="min-h-dvh pb-28">
    <Navbar />
    <section className="py-20 sm:py-28 lg:py-32">
      <div className={shell}>
        <Eyebrow>Capture gear / Launch catalog</Eyebrow>
        <PageTitle className="mt-5">Tools for high-quality human perspective.</PageTitle>
        <p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Order selected demo gear with mUSDG on Arbitrum Sepolia, or join the waitlist for equipment still in evaluation.</p>
        <GearCatalog />
      </div>
    </section>
    <Footer />
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-[var(--surface)]/95 px-5 py-3 text-center text-[13px] text-white/50 backdrop-blur-lg">
      Payments powered by <a href="https://digipaga.com" target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center ${inlineLink}`}>DigiPaga</a>
    </div>
  </main>;
}
