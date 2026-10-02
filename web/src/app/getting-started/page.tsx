import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Check, ClipboardList, Upload, WalletCards } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Eyebrow, PrimaryLink, shell } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Getting Started — DigiRobotics",
  description: "How contributing to DigiRobotics works, from registration to getting paid.",
  alternates: { canonical: "/getting-started" },
  openGraph: {
    title: "Getting Started — DigiRobotics",
    description: "How contributing to DigiRobotics works, from registration to getting paid.",
    url: "/getting-started",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Getting Started — DigiRobotics",
    description: "How contributing to DigiRobotics works, from registration to getting paid.",
  },
};

function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`max-w-4xl font-heading text-[clamp(2.45rem,5vw,5.4rem)] font-medium leading-[.94] tracking-[-.045em] text-[var(--foreground)] ${className}`}>{children}</h1>;
}

const steps = [
  { number: "01", title: "Register your profile", description: "Create a contributor profile so you can be matched against upcoming campaigns and eligibility checks.", icon: ClipboardList },
  { number: "02", title: "Capture an approved task", description: "When a campaign is assigned, record the requested first-person task with your phone or supported camera.", icon: Upload },
  { number: "03", title: "Submit and earn", description: "After review and acceptance, your contribution is paid in USDG or PYUSD.", icon: WalletCards },
];

export default function GettingStartedPage() {
  return <main className="min-h-dvh">
    <Navbar />
    <section className="py-20 sm:py-28 lg:py-32">
      <div className={shell}>
        <div className="max-w-4xl">
          <Eyebrow>Contributor program / How it works</Eyebrow>
          <PageTitle className="mt-5">Here’s how contributing to DigiRobotics works.</PageTitle>
          <p className="mt-6 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Three steps take you from registering a contributor profile to getting paid for approved capture tasks.</p>
        </div>
        <ol className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map(({ number, title, description, icon: Icon }) => <li key={number} className="group rounded-2xl border border-white/[.09] bg-[var(--surface)] p-7 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30">
            <div className="flex items-center justify-between"><span className="font-mono text-[12px] text-[var(--primary)]">{number}</span><Icon aria-hidden="true" className="text-white/45 transition-colors duration-300 ease-out group-hover:text-[var(--primary)]" size={24} /></div>
            <h2 className="mt-12 font-heading text-2xl transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h2>
            <p className="mt-4 text-[17px] leading-6 text-[var(--muted-foreground)]">{description}</p>
          </li>)}
        </ol>
        <div className="mt-10 rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-6 sm:p-8">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-[var(--primary)]"><Check size={17} aria-hidden="true" /> Capture agent / Coming soon</p>
          <p className="mt-4 max-w-3xl text-[18px] leading-7 text-white/75">The Telegram capture agent <strong className="font-medium text-white">@DigiRoboticsCapture_bot</strong> will guide submissions once it is deployed. It is not active yet, so no video submission is required now.</p>
        </div>
        <div className="mt-9"><PrimaryLink href="/gear">Explore capture gear</PrimaryLink></div>
      </div>
    </section>
    <Footer />
  </main>;
}
