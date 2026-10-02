import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MarkdownArticle } from "@/components/blog/MarkdownArticle";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { getAllBlogPostMetadata, getBlogPost } from "@/lib/blog";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

function humanDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

// Posts are read from content/blog at build time. A deployed Worker has no content
// directory to read, so slugs outside generateStaticParams are a 404, not a render.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllBlogPostMetadata();
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Field note not found — DigiRobotics" };

  return {
    title: `${post.title} — DigiRobotics`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: post.coverImage ? [{ url: post.coverImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "DigiRobotics", url: "https://digirobotics.xyz" },
    mainEntityOfPage: `https://digirobotics.xyz/blog/${post.slug}`,
    image: post.coverImage ? `https://digirobotics.xyz${post.coverImage}` : undefined,
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-white">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article>
        <header className="relative overflow-hidden border-b border-white/10">
          <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:radial-gradient(oklch(from_var(--primary)_l_c_h_/_24%)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
            <Link href="/blog" className="inline-flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"><ArrowLeft size={14} aria-hidden="true" /> Back to field notes</Link>
            <div className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em]">
              <span className="text-[var(--primary)]">{post.category}</span><span aria-hidden="true" className="text-white/25">/</span><time dateTime={post.publishedAt} className="text-[var(--muted-foreground)]">{humanDate(post.publishedAt)}</time><span aria-hidden="true" className="text-white/25">/</span><span className="text-[var(--muted-foreground)]">{post.readingTime}</span>
            </div>
            <h1 className="mt-7 max-w-5xl font-display text-[clamp(3rem,8vw,6.6rem)] font-bold leading-[0.93] tracking-[-0.03em]">{post.title}</h1>
            <p className="mt-8 max-w-3xl text-xl leading-9 text-[var(--muted-foreground)] sm:text-2xl">{post.excerpt}</p>
            <div className="mt-10 flex items-center gap-3 text-[14px]"><span className="grid size-10 place-items-center rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 font-heading text-[var(--primary)]">DR</span><div><p className="font-semibold">{post.author}</p>{post.updatedAt ? <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">Updated {humanDate(post.updatedAt)}</p> : null}</div></div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[170px_minmax(0,760px)] lg:justify-center">
          <aside className="hidden lg:block"><div className="sticky top-28 border-t border-[var(--primary)] pt-4 font-mono text-[9px] uppercase leading-5 tracking-[0.15em] text-[var(--muted-foreground)]">DigiRobotics<br />Field note<br />{post.publishedAt.replaceAll("-", ".")}</div></aside>
          <div className="min-w-0"><MarkdownArticle content={post.content} /><div className="mt-16 border-t border-white/10 pt-8"><Link href="/blog" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[14px] font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"><ArrowLeft size={16} aria-hidden="true" /> Return to the archive</Link></div></div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
