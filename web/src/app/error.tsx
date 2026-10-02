"use client";

import { useEffect } from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { PrimaryLink, SectionTitle, primaryAction } from "@/components/ui/Primitives";

// DR-C-09: the public site had no error boundary at all, so any render error below the root
// layout fell through to Next's unstyled default. Reuses the site's own Navbar/Footer and
// heading primitives (error boundaries must be Client Components per Next.js). Scoped to
// web/src/app/, so it never shadows web/src/app/ops/(console)/error.tsx.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col">
      <Navbar />
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[.18em] text-[var(--primary)]">Error</p>
        <SectionTitle as="h1" className="mt-4 text-center">Something broke on our end.</SectionTitle>
        <p className="mt-5 max-w-xl text-lg leading-7 text-[var(--muted-foreground)]">
          This page failed to load. Your session and any cart items are unaffected.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[var(--page-bg)] ${primaryAction}`}
          >
            Try again
          </button>
          <PrimaryLink href="/">Back to home</PrimaryLink>
        </div>
      </section>
      <Footer />
    </main>
  );
}
