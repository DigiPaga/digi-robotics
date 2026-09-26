import type { Metadata } from "next";
import { GearCatalog } from "@/components/gear/GearCatalog";
import { Navbar } from "@/components/landing/Navbar";
import { Eyebrow, SectionTitle, inlineLink, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Capture Gear — DigiRobotics",
  description: "Explore upcoming capture devices, mounts, audio, sensors, lighting, and processing tools for DigiRobotics campaigns.",
};

export default function GearPage() {
  return <main className="min-h-dvh pb-28">
    <Navbar />
    <section className="py-20 sm:py-28 lg:py-32">
      <div className={shell}>
        <Eyebrow>Capture gear / Launch catalog</Eyebrow>
        <SectionTitle className="mt-5">Tools for high-quality human perspective.</SectionTitle>
        <p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Browse the equipment we’re evaluating for future data campaigns. Everything is coming soon; join an item waitlist and we’ll notify you as access opens.</p>
        <GearCatalog />
      </div>
    </section>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-[var(--surface)]/95 px-5 py-3 text-center text-[13px] text-white/50 backdrop-blur-lg">
      Payments powered by <a href="https://digipaga.com" target="_blank" rel="noreferrer" className={inlineLink}>DigiPaga</a>
    </div>
  </main>;
}
