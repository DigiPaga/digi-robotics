import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogPostMetadata } from "@/lib/blog";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function BlogCard({ post, priority = false }: { post: BlogPostMetadata; priority?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/45 hover:shadow-[0_24px_70px_-35px_oklch(from_var(--primary)_l_c_h_/_45%)]">
      {post.coverImage ? (
        <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/9] overflow-hidden border-b border-white/10">
          <Image
            src={post.coverImage}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover opacity-80 grayscale-[20%] transition duration-700 group-hover:scale-[1.035] group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)]/70 via-transparent to-transparent" />
        </Link>
      ) : null}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em]">
          <span className="text-[var(--primary)]">{post.category}</span>
          <time dateTime={post.publishedAt} className="text-[var(--muted-foreground)]">{formatDate(post.publishedAt)}</time>
        </div>
        <h2 className="mt-5 font-heading text-[1.55rem] leading-[1.16] tracking-[-0.025em] text-white sm:text-[1.7rem]">
          <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-[var(--primary)]">
            {post.title}
          </Link>
        </h2>
        <p className="mt-4 text-[16px] leading-7 text-[var(--muted-foreground)]">{post.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-4 pt-7 text-[13px] text-white/55">
          <span>{post.readingTime}</span>
          <Link href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`} className="grid size-11 place-items-center rounded-full border border-white/15 text-white transition duration-300 group-hover:border-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-[var(--page-bg)]">
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
