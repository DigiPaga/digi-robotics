import type { Metadata } from "next";
import { Braces, CircleDot, Radio } from "lucide-react";
import { AgentDemo } from "@/components/agent-demo/AgentDemo";
import { OnChainProof } from "@/components/agent-demo/OnChainProof";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const TITLE = "Real x402 Agent Demo — DigiRobotics";
const DESCRIPTION = "Watch an autonomous agent discover, evaluate, purchase, and unlock robotics training data through a real x402 v2 payment.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://digirobotics.xyz/agent-demo" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://digirobotics.xyz/agent-demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function AgentDemoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--page-bg)] text-white">
      <Navbar />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_70%_10%,oklch(0.82_0.21_130/.11),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,.025),transparent)]" />
      <header className="relative mx-auto w-full max-w-[1500px] px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-16">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[.2em] text-[var(--primary)]">
          <span className="flex items-center gap-2"><CircleDot size={13} /> autonomous commerce / live testnet</span>
          <span className="hidden items-center gap-2 text-white/40 sm:flex"><Radio size={12} /> HTTP 402</span>
          <span className="hidden items-center gap-2 text-white/40 sm:flex"><Braces size={12} /> policy bound</span>
        </div>
        <h1 className="mt-6 max-w-6xl font-display text-[clamp(3.4rem,9vw,8.7rem)] font-bold leading-[.83] tracking-[-.065em]">WATCH AN AGENT BUY <span className="text-[var(--primary)]">ROBOT VISION.</span></h1>
        <div className="mt-9 flex max-w-4xl flex-col gap-5 border-l border-[var(--primary)]/50 pl-5 sm:flex-row sm:items-center sm:justify-between sm:pl-7"><p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Real discovery. Deterministic policy. A genuine x402 v2 challenge, authorization, facilitator settlement, and gated dataset unlock.</p><p className="shrink-0 font-mono text-[10px] uppercase leading-5 tracking-[.14em] text-white/40">Configured testnet<br />USDG-compatible · exact</p></div>
      </header>
      <OnChainProof />
      <AgentDemo />
      <Footer />
    </main>
  );
}
