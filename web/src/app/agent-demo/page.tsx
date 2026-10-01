import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Braces, CircleDot, Radio } from "lucide-react";
import { AgentDemoConsole } from "@/components/agent-demo/AgentDemoConsole";

export const metadata: Metadata = {
  title: "Real x402 Agent Demo — DigiRobotics",
  description: "Watch an autonomous agent discover, evaluate, purchase, and unlock robotics training data through a real x402 v2 payment.",
};

export default function AgentDemoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--page-bg)] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_70%_10%,oklch(0.82_0.21_130/.11),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,.025),transparent)]" />
      <nav className="relative mx-auto flex w-full max-w-[1500px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-white/60 transition hover:text-white"><ArrowLeft size={14} /> DigiRobotics</Link>
        <div className="hidden items-center gap-5 font-mono text-[9px] uppercase tracking-[.15em] text-white/40 sm:flex"><span className="flex items-center gap-2"><Radio size={12} className="text-[var(--primary)]" /> HTTP 402</span><span className="flex items-center gap-2"><Braces size={12} /> policy bound</span></div>
      </nav>
      <header className="relative mx-auto w-full max-w-[1500px] px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-16">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-[var(--primary)]"><CircleDot size={13} /> autonomous commerce / live testnet</div>
        <h1 className="mt-6 max-w-6xl font-display text-[clamp(3.4rem,9vw,8.7rem)] font-bold leading-[.83] tracking-[-.065em]">AN AGENT JUST BOUGHT <span className="text-[var(--primary)]">ROBOT VISION.</span></h1>
        <div className="mt-9 flex max-w-4xl flex-col gap-5 border-l border-[var(--primary)]/50 pl-5 sm:flex-row sm:items-center sm:justify-between sm:pl-7"><p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Real discovery. Deterministic policy. A genuine x402 v2 challenge, authorization, facilitator settlement, and gated dataset unlock.</p><p className="shrink-0 font-mono text-[10px] uppercase leading-5 tracking-[.14em] text-white/40">Configured testnet<br />USDG-compatible · exact</p></div>
      </header>
      <AgentDemoConsole />
    </main>
  );
}
