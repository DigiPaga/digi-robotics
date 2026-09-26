import Image from "next/image";
import { Check, Radio, Upload, WalletCards } from "lucide-react";
import { AuthButton } from "@/components/auth/AuthButton";
import { Eyebrow, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const steps = [
  ["01", "LOGIN —", "Create your profile, register for upcoming campaigns.", Radio],
  ["02", "CAPTURE —", "Record approved first-person tasks using a phone or supported camera.", Upload],
  ["03", "EARN —", "Receive USDG or PYUSD after acceptance.", WalletCards],
] as const;

export function ContributorSection() {
  return <section id="contributors" className="scroll-mt-24 border-y border-white/[.07] bg-[#141923] py-24 sm:py-32 lg:py-40">
    <div className={`${shell} grid gap-14 lg:grid-cols-[.92fr_1.08fr] lg:items-center`}>
      <Reveal>
        <Eyebrow>03 / Contribute and earn</Eyebrow>
        <SectionTitle className="mt-5">Turn real-world skills into audiovisual training data.</SectionTitle>
        <p className="mt-6 max-w-xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Create your profile, register for upcoming campaigns, and capture approved first-person tasks using a phone or supported camera.</p>
        <ol className="mt-9 border-t border-white/10">
          {steps.map(([number, label, description, Icon]) => <li key={number} className="grid min-h-24 grid-cols-[42px_1fr_32px] items-center gap-3 border-b border-white/10 py-4"><span className="font-mono text-[12px] text-[var(--primary)]">{number}</span><span><strong className="block font-heading text-base font-medium sm:text-lg">{label}</strong><span className="mt-1 block text-[15px] leading-5 text-[var(--muted-foreground)] sm:text-[16px]">{description}</span></span><Icon aria-hidden="true" size={20} className="text-white/45" /></li>)}
        </ol>
        <AuthButton className="mt-8 min-h-13 rounded-full bg-[var(--primary)] px-6 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[#10150f] transition hover:brightness-110">Join the first capture campaigns ↗</AuthButton>
        <p className="mt-5 flex items-center gap-2 text-[16px] font-medium text-[var(--primary)]"><Check size={18} aria-hidden="true" /> Gmail or email OTP. No previous robotics experience required.</p>
      </Reveal>
      <Reveal delay={0.12} className="relative">
        <div className="grid grid-cols-[1fr_.28fr] gap-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10"><Image src="/digirobotics/contributor/parcel-capture.webp" alt="First-person view of a contributor packing a parcel" fill sizes="(max-width: 1024px) 75vw, 45vw" className="object-cover" /></div>
          <div className="flex flex-col gap-3">
            {["ASSIGN", "CAPTURE", "REVIEW", "ACCEPT"].map((item, index) => <div key={item} className="flex flex-1 flex-col justify-between rounded-xl border border-white/10 bg-[#1a202d] p-3"><span className="font-mono text-[10px] text-[var(--primary)]">0{index + 1}</span><span className="font-mono text-[9px] uppercase tracking-[.1em] [writing-mode:vertical-rl] text-white/65">{item}</span></div>)}
          </div>
        </div>
        <div className="absolute -bottom-5 -left-3 rounded-xl border border-[var(--primary)]/30 bg-[#11170f] px-4 py-3 font-mono text-[10px] uppercase tracking-[.15em] text-[var(--primary)] shadow-xl">Human signal / verified task</div>
      </Reveal>
    </div>
  </section>;
}
