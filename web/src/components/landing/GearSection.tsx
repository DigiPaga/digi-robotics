import Image from "next/image";
import { Box, Camera, CircleDot, Smartphone } from "lucide-react";
import { Eyebrow, PrimaryLink, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const gear = [
  ["HEAD-MOUNTED PHONE HOLDER", "COMING SOON", Smartphone],
  ["CHEST-MOUNT CAPTURE HARNESS", "PILOT EQUIPMENT", Box],
  ["DEPTH CAMERA", "JOIN GEAR WAITLIST", Camera],
  ["MOTION AND SENSOR KIT", "PILOT EQUIPMENT", CircleDot],
] as const;

export function GearSection() {
  return <section id="capture-gear" className="scroll-mt-24 border-y border-white/[.07] bg-[#141923] py-24 sm:py-32 lg:py-40">
    <div className={shell}>
      <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
        <Reveal><Eyebrow>05 / Capture equipment</Eyebrow><SectionTitle className="mt-5">Gear up for the next wave of data creation.</SectionTitle><p className="mt-6 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Explore cameras, holders, wearables, and sensors designed for stable first-person capture.</p></Reveal>
        <Reveal delay={0.1}><div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-white/10"><Image src="/digirobotics/gear/capture-kit.webp" alt="Head mount, chest harness, depth camera, and motion sensors arranged on a workbench" fill sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover" /></div></Reveal>
      </div>
      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
        {gear.map(([title, status, Icon], index) => <article key={title} className="group min-h-[230px] border border-transparent bg-[var(--surface)] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30"><div className="flex items-start justify-between"><span className="font-mono text-[11px] text-white/40">0{index + 1}</span><Icon aria-hidden="true" size={26} className="text-[var(--primary)]" /></div><h3 className="mt-16 font-heading text-xl leading-tight transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h3><p className="mt-4 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">{status}</p></article>)}
      </div>
      <div className="mt-10"><PrimaryLink href="/gear">Explore all capture gear</PrimaryLink></div>
    </div>
  </section>;
}
