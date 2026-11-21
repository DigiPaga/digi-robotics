import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function isExternalHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("http://");
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-6 mt-6 scroll-mt-24 font-display text-3xl md:text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-6 scroll-mt-24 font-heading text-xl md:text-2xl leading-tight tracking-[-0.03em] text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-4 mt-4 scroll-mt-20 font-heading text-lg leading-tight text-white">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 text-base leading-relaxed text-[var(--muted-foreground)]">
      {children}
    </p>
  ),
  a: ({ href = "", children }) => {
    const classes =
      "font-semibold text-[var(--primary)] underline decoration-[var(--primary)]/35 underline-offset-4 transition hover:decoration-[var(--primary)]";
    return isExternalHref(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
      >
        {children}
      </a>
    ) : (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  },
  ul: ({ children }) => (
    <ul className="my-6 space-y-3 pl-1 text-base leading-relaxed text-[var(--muted-foreground)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-6 list-decimal space-y-3 pl-7 text-base leading-relaxed text-[var(--muted-foreground)] marker:font-mono marker:text-[var(--primary)]">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      {...props}
      className="relative pl-6 text-base leading-relaxed before:absolute before:left-0 before:top-[0.72em] before:size-1.5 before:rounded-full before:bg-[var(--primary)]"
    >
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-10 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.06] px-6 py-2 font-heading text-xl leading-8 text-white sm:px-8">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => (
    <code
      {...props}
      className={`${className ?? ""} rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.86em] text-[#b9ef65]`}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-9 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0d12] p-5 text-[14px] leading-7 shadow-2xl [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-14 border-0 border-t border-white/10" />,
  table: ({ children }) => (
    <div className="my-9 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-left text-[15px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.05] font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--primary)]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/10 px-5 py-4 font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/[0.07] px-5 py-4 leading-6 text-[var(--muted-foreground)] last:[tr:last-child_&]:border-b-0">
      {children}
    </td>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
};

export function MarkdownArticle({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
