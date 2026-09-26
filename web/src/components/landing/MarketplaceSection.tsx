import { AirVent, CarFront, Drill, Fuel, Gauge, Package, PanelsTopLeft, Settings2, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Eyebrow, PrimaryLink, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

type Dataset = { title: string; category: string; copy: string; action: string; icon: LucideIcon };
const datasets: Dataset[] = [
  { title: "AIR CONDITIONER SETUP", category: "HOME SYSTEMS", copy: "Control identification, settings, and environmental context.", action: "PREVIEW DATA", icon: AirVent },
  { title: "UNLOCK AND ENTER A VEHICLE", category: "MOBILITY", copy: "Approach, access, door handling, and cabin entry sequence.", action: "REQUEST ACCESS", icon: CarFront },
  { title: "VEHICLE REFUELING", category: "MOBILITY", copy: "Fuel-door access, nozzle handling, and safe task completion.", action: "PREVIEW DATA", icon: Fuel },
  { title: "FUEL TYPE SELECTION", category: "DECISION TASK", copy: "Label recognition and deliberate control selection in context.", action: "REQUEST ACCESS", icon: Gauge },
  { title: "DISHWASHER LOADING", category: "HOUSEHOLD", copy: "Object placement, rack constraints, and manipulation patterns.", action: "PREVIEW DATA", icon: Utensils },
  { title: "WORKSTATION SETUP", category: "DIGITAL + PHYSICAL", copy: "Peripheral connection, cable routing, and device configuration.", action: "REQUEST ACCESS", icon: PanelsTopLeft },
  { title: "HOUSEHOLD ASSEMBLY", category: "MANIPULATION", copy: "Part alignment, sequencing, fastening, and tool coordination.", action: "PREVIEW DATA", icon: Settings2 },
  { title: "PARCEL PACKING", category: "LOGISTICS", copy: "Packing order, protection, sealing, and label-ready preparation.", action: "PREVIEW DATA", icon: Package },
  { title: "HAND TOOL OPERATION", category: "TOOL USE", copy: "Grip, alignment, force application, and safe tool return.", action: "REQUEST ACCESS", icon: Drill },
];

export function MarketplaceSection() {
  return <section id="marketplace" className="scroll-mt-24 py-24 sm:py-32 lg:py-40">
    <div className={shell}>
      <Reveal><Eyebrow>02 / Training data marketplace</Eyebrow><SectionTitle className="mt-5">5.4 Billion Smartphones. One New Way to Earn.</SectionTitle><p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">The next era of content creation is robotics training data. Get paid in stablecoins for capturing it. Preview first-person task data designed for perception, planning, manipulation, and embodied AI research.</p></Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {datasets.map(({ title, category, copy, action, icon: Icon }, index) => <article key={title} className="group overflow-hidden rounded-2xl border border-white/[.09] bg-[var(--surface)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 focus-within:border-[var(--primary)]/30">
          <div className="relative aspect-[8/5] overflow-hidden border-b border-white/[.08] bg-[#10151e]">
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(0.82_0.21_130/.17),transparent_38%)]" />
            <span className="absolute left-5 top-5 font-mono text-[11px] uppercase tracking-[.16em] text-[var(--primary)]">POV / {String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" size={76} className="absolute bottom-6 right-6 text-white/65 transition-colors duration-300 ease-out group-hover:text-[var(--primary)]" />
            <span className="absolute bottom-5 left-5 h-3 w-3 border-b border-l border-[var(--primary)]" /><span className="absolute right-5 top-5 h-3 w-3 border-r border-t border-[var(--primary)]" />
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[.15em] text-[var(--primary)]">{category}</p>
            <h3 className="mt-3 font-heading text-2xl leading-[1.05] transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h3>
            <p className="mt-4 text-[17px] leading-6 text-[var(--muted-foreground)]">{copy}</p>
            <a href="#custom-data" className="relative mt-6 inline-flex min-h-11 items-center text-[13px] font-semibold tracking-[.08em] text-white transition-colors duration-300 ease-out after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-[var(--primary)] after:transition-transform after:duration-300 after:ease-out hover:text-[var(--primary)] hover:after:scale-x-100">{action} →</a>
          </div>
        </article>)}
      </div>
      <div className="mt-12"><PrimaryLink href="#join">Enter the marketplace</PrimaryLink></div>
    </div>
  </section>;
}
