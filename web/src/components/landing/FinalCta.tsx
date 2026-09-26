import { AuthButton } from "@/components/auth/AuthButton";
import { SecondaryLink, shell } from "@/components/ui/Primitives";

export function FinalCta() {
  return <section id="join" className="relative scroll-mt-24 overflow-hidden py-28 sm:py-36 lg:py-48">
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,oklch(0.82_0.21_130/.15),transparent_42%)]" />
    <div aria-hidden="true" className="absolute inset-0 opacity-[.025] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_120_120%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%22.9%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.6%22/%3E%3C/svg%3E')]" />
    <div className={`${shell} relative text-center`}>
      <p className="font-mono text-[12px] uppercase tracking-[.2em] text-[var(--primary)]">Registration / Phase 1</p>
      <h2 className="mx-auto mt-6 max-w-5xl font-display text-[clamp(3rem,7vw,7.8rem)] font-bold uppercase leading-[.9] tracking-[-.06em]">The first DigiRobotics campaigns are coming.</h2>
      <p className="mx-auto mt-7 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Register now to contribute first-person data, request a custom campaign, or receive marketplace launch updates.</p>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <AuthButton className="inline-flex min-h-13 items-center justify-center rounded-full bg-[var(--primary)] px-7 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[#10150f] motion-safe:animate-[breathe_2.6s_ease-in-out_infinite]">Join as a contributor ↗</AuthButton>
        <SecondaryLink href="#custom-data">Request custom data</SecondaryLink>
      </div>
      <a href="mailto:hello@digirobotics.xyz?subject=Marketplace%20updates" className="mt-7 inline-flex min-h-11 items-center border-b border-white/30 font-mono text-[12px] uppercase tracking-[.15em] text-white transition hover:border-[var(--primary)] hover:text-[var(--primary)]">Get marketplace updates</a>
    </div>
  </section>;
}
