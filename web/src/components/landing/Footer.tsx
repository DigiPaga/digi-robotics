import Image from "next/image";
import { shell } from "@/components/ui/Primitives";

const links = [
  ["Contributor", "#contributors"], ["Marketplace", "#marketplace"], ["Custom Data", "#custom-data"], ["Capture Gear", "#capture-gear"],
  ["Privacy", "#privacy-note"], ["Terms", "#privacy-note"], ["Contact Us", "mailto:hello@digirobotics.xyz"],
];

export function Footer() {
  return <footer className="border-t border-white/[.08] bg-[#111620] py-12">
    <div className={shell}>
      <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start">
        <div><Image src="/digirobotics/brand/digirobotics-logo.png" alt="DigiRobotics.xyz" width={210} height={48} className="h-auto w-[190px]" /><p className="mt-4 text-[17px] text-white/60">Egocentric data for robotics training.</p></div>
        <nav aria-label="Footer navigation" className="flex max-w-2xl flex-wrap gap-x-7 gap-y-3">{links.map(([label, href]) => <a key={label} href={href} className="min-h-11 py-3 text-[14px] font-medium text-white/65 transition hover:text-[var(--primary)]">{label}</a>)}</nav>
      </div>
      <div id="privacy-note" className="mt-10 grid gap-4 border-t border-white/[.08] pt-6 text-[13px] leading-5 text-white/45 sm:grid-cols-[1fr_auto]">
        <p>Privacy and terms notices will be published before campaign enrollment or data collection begins. Contact Us the team for Phase 1 information.</p><p>© 2026 DigiRobotics</p>
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-white/35">Agent-compatible payment workflows powered by stablecoins and x402. Phase 1 infrastructure.</p>
    </div>
  </footer>;
}
