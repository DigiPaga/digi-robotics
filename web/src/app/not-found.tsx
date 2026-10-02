import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { PrimaryLink, SectionTitle } from "@/components/ui/Primitives";

// DR-C-09, DR-L-19: the public 404 was Next's unstyled default (white page, no nav, no way
// back). This reuses the site's own Navbar/Footer and heading primitives instead of a new
// design. Scoped to web/src/app/, so it never shadows web/src/app/ops/(console)/not-found.tsx
// — Next.js resolves the nearest boundary in the route tree, and /ops keeps its own.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <Navbar />
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[.18em] text-[var(--primary)]">404</p>
        <SectionTitle as="h1" className="mt-4 text-center">This page went offline.</SectionTitle>
        <p className="mt-5 max-w-xl text-lg leading-7 text-[var(--muted-foreground)]">
          The page you are looking for does not exist, or the link is out of date.
        </p>
        <PrimaryLink href="/" className="mt-8">Back to home</PrimaryLink>
      </section>
      <Footer />
    </main>
  );
}
