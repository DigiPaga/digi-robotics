import Image from "next/image";
import { ScanLine } from "lucide-react";
import { AuthButton } from "@/components/auth/AuthButton";
import { Eyebrow, SecondaryLink, primaryAction, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const partners = [
  ["/digirobotics/partners/arbitrum.png", "Built with Arbitrum", "w-full scale-[1.61] origin-left", "1.25fr"],
  ["/digirobotics/partners/robinhood-chain.png", "Built with Robinhood Chain", "w-full", "1.25fr"],
  ["/digirobotics/partners/zerodev.png", "Built with ZeroDev", "w-4/5", "1fr"],
  ["/digirobotics/partners/paxos.png", "Built with Paxos", "w-4/5", "1fr"],
];

export function HeroSection() {
  return <section className="relative border-b border-white/[.07] pt-14 sm:pt-20 lg:pt-24">
    <div className={`${shell} grid items-center gap-12 lg:grid-cols-[.86fr_1.14fr] lg:gap-12`}>
      <Reveal>
        <Eyebrow>01 / Egocentric data for robotics</Eyebrow>
        <h1 className="mt-7 max-w-[700px] font-display text-[clamp(3.35rem,5vw,4rem)] font-bold uppercase leading-[.9] tracking-[-.055em]">
          <span className="block">Teach robots.</span><span className="block text-[var(--primary)]">Earn stablecoins.</span><span className="block">Through human eyes.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[20px]">The first stablecoin-native marketplace for agentic commerce in real-world data collection. Everyday content creation becomes robotics training data — contributors are paid in USDG or PYUSD, with autonomous AI agents purchasing around the clock.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <AuthButton className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary)] px-6 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[var(--page-bg)] ${primaryAction}`}>Become a contributor ↗</AuthButton>
          <SecondaryLink href="#custom-data">Request custom data</SecondaryLink>
        </div>
      </Reveal>

      <Reveal delay={0.12} className="relative lg:translate-y-4">
        <div aria-hidden="true" className="absolute -inset-8 rounded-[50%] border border-[var(--primary)]/10" />
        <div aria-hidden="true" className="absolute -inset-16 rounded-[50%] border border-white/[.05]" />
        <div className="relative aspect-[8/6.15] overflow-hidden rounded-[28px] border border-white/10 bg-[var(--surface)] shadow-[var(--shadow-lift)]">
          <Image src="/digirobotics/hero/pov-thermostat.webp" alt="First-person view of hands installing a smart control panel" fill sizes="(max-width: 1024px) 100vw, 56vw" className="object-cover" priority />
          <div className="absolute inset-x-0 top-0 h-px bg-[var(--primary)]/80 shadow-[0_0_20px_var(--primary)] motion-safe:animate-[scan_5s_ease-in-out_infinite]" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-[#0d130f]/90 px-3 py-2 font-mono text-[11px] uppercase tracking-[.14em] text-[var(--primary)]"><ScanLine size={14} aria-hidden="true" /> POV capture</div>
          <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[.14em] text-white/75">Spatial track · 01</div>
        </div>
      </Reveal>
    </div>
    <div className={`${shell} mt-16 border-t border-white/[.07] py-7 lg:mt-24`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <span className="font-mono text-[11px] uppercase tracking-[.18em] text-white/55">Built with</span>
        <div className="grid w-full max-w-[560px] grid-cols-[1.25fr_1.25fr_1fr_1fr] items-center gap-4 sm:gap-6">
          {partners.map(([src, alt, width]) => <div key={src} className="group relative h-9 transition-transform duration-300 ease-out hover:-translate-y-0.5"><Image src={src} alt={alt} fill sizes="140px" className={`object-contain object-left opacity-70 transition-opacity duration-300 ease-out group-hover:opacity-100 ${width}`} /></div>)}
        </div>
      </div>
    </div>
  </section>;
}
