import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crosshair } from "lucide-react";
import { BlogCard } from "@/components/blog/BlogCard";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { getAllBlogPostMetadata } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Field Notes — DigiRobotics",
  description: "Research notes on robotics training data, AI agents, x402, stablecoins, and digital asset licensing.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Field Notes — DigiRobotics",
    description: "Ideas and implementation notes from the edge of robotics data and agentic commerce.",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPostMetadata();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const remaining = featured ? posts.filter((post) => post.slug !== featured.slug) : [];

  return (
    <main className="min-h-screen overflow-clip bg-[#0e1118] text-white">
      <Navbar />
      <section className="relative border-b border-white/10">
        <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div aria-hidden="true" className="absolute -right-28 top-10 size-[420px] rounded-full bg-[#84cc16]/10 blur-[110px]" />
        <div className="relative mx-auto max-w-[1440px] px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28 lg:px-12 xl:px-16">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#84cc16]">
            <Crosshair size={15} aria-hidden="true" /> Research dispatch / 001
          </div>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
            <h1 className="max-w-5xl font-display text-[clamp(3.4rem,9vw,8.4rem)] font-bold leading-[0.82] tracking-[-0.075em]">
              Field<br /><span className="text-[#84cc16]">notes.</span>
            </h1>
            <div className="border-l border-[#84cc16]/55 pl-6 sm:pl-8">
              <p className="text-xl leading-8 text-[#d2d5dc]">Signals from the intersection of human skill, machine perception, and autonomous commerce.</p>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b8bcc6]">Robotics / agents / protocols / provenance</p>
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 xl:px-16">
          <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="text-[#84cc16]">Featured transmission</span>
            <span className="text-[#b8bcc6]">{featured.readingTime}</span>
          </div>
          <article className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#161c29] lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(132,204,22,.2),transparent_35%),linear-gradient(135deg,#1d2634,#0e1118)] p-8 sm:min-h-[430px] sm:p-12">
              <div aria-hidden="true" className="absolute inset-0 opacity-40 [background-image:linear-gradient(125deg,transparent_48%,rgba(132,204,22,.45)_49%,transparent_50%)] [background-size:38px_38px]" />
              <div className="relative flex h-full flex-col justify-between">
                <span className="w-fit rounded-full border border-[#84cc16]/40 bg-[#0e1118]/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#a3e635]">{featured.category}</span>
                <div className="mt-20 font-display text-[clamp(4.5rem,12vw,9rem)] font-bold leading-none tracking-[-0.08em] text-white/10">DR</div>
              </div>
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-14">
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#b8bcc6]">{featured.publishedAt} · {featured.author}</p>
              <h2 className="mt-6 font-heading text-[clamp(2rem,4vw,3.4rem)] leading-[1.03] tracking-[-0.045em]">{featured.title}</h2>
              <p className="mt-6 text-[17px] leading-8 text-[#b8bcc6]">{featured.excerpt}</p>
              <Link href={`/blog/${featured.slug}`} className="mt-10 inline-flex w-fit items-center gap-3 rounded-full bg-[#84cc16] px-6 py-3 text-[14px] font-semibold text-[#0e1118] transition hover:bg-[#a3e635] focus-visible:outline-white">
                Read the field note <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-5 py-28 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#84cc16]">Archive initializing</p>
          <h2 className="mt-5 font-heading text-4xl">Field notes are on the way.</h2>
          <p className="mt-5 leading-8 text-[#b8bcc6]">The content directory is ready. Add a validated Markdown post to publish the first entry.</p>
        </section>
      )}

      {remaining.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12 xl:px-16">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#84cc16]">Archive</p><h2 className="mt-3 font-heading text-3xl tracking-[-0.035em] sm:text-4xl">Latest observations</h2></div>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#b8bcc6]">{String(posts.length).padStart(2, "0")} entries</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((post) => <BlogCard key={post.slug} post={post} />)}
          </div>
        </section>
      ) : null}
      <Footer />
    </main>
  );
}
