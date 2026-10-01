import { KeyRound, LockKeyhole, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow, primaryAction, shell } from "@/components/ui/Primitives";

export function OpsFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="min-h-dvh pb-24">
      <header className="border-b border-white/[.08]">
        <div className={`${shell} flex min-h-16 items-center justify-between gap-4`}>
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            DigiRobotics <span className="font-mono text-xs font-medium uppercase tracking-[.18em] text-[var(--primary)]">ops</span>
          </Link>
          {aside}
        </div>
      </header>
      <section className="py-10 sm:py-14">
        <div className={shell}>{children}</div>
      </section>
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[var(--surface)] p-8 sm:p-10">{children}</div>;
}

/** Deliberately generic: this page is public, so it never says what is missing. */
export function OpsNotConfigured() {
  return (
    <OpsFrame>
      <Card>
        <ShieldAlert className="text-[#ffb5ac]" size={30} aria-hidden="true" />
        <div className="mt-5"><Eyebrow>Ops / Not configured</Eyebrow></div>
        <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.02em]">Ops is not configured.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
          Sign-in is disabled and nobody can get in while this page shows. If you operate this deployment, the server log says what to fix.
        </p>
      </Card>
    </OpsFrame>
  );
}

/** A Map, not an object: `?error=constructor` must not resolve to an inherited property. */
const ERROR_COPY: ReadonlyMap<string, string> = new Map([
  ["denied", "That Google account is not on the ops allowlist."],
  ["failed", "Sign-in did not complete. Try again."],
]);

export function OpsSignIn({ error }: { error?: string }) {
  const message = error ? ERROR_COPY.get(error) : undefined;
  return (
    <OpsFrame>
      <Card>
        <LockKeyhole className="text-[var(--primary)]" size={30} aria-hidden="true" />
        <div className="mt-5"><Eyebrow>Ops / Private</Eyebrow></div>
        <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.02em]">Sign in to ops.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
          Wallet balances and testnet top-ups for the DigiRobotics operators. Access is limited to allowlisted Google accounts.
        </p>
        {message ? <p role="alert" className="mt-5 rounded-2xl border border-[#ff6b5e]/30 bg-[#ff6b5e]/10 px-4 py-3 text-sm text-[#ffb5ac]">{message}</p> : null}
        <a
          href="/ops/login"
          className={`mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--page-bg)] ${primaryAction}`}
        >
          <KeyRound size={16} aria-hidden="true" /> Continue with Google
        </a>
      </Card>
    </OpsFrame>
  );
}
