import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function isExternalHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("http://");
}

const components: Components = {
  h2: ({ children }) => <h2 className="mb-5 mt-14 scroll-mt-28 font-heading text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-4 mt-10 scroll-mt-28 font-heading text-2xl leading-tight text-white">{children}</h3>,
  p: ({ children }) => <p className="my-6 text-[18px] leading-[1.85] text-[#d2d5dc]">{children}</p>,
  a: ({ href = "", children }) => {
    const classes = "font-semibold text-[#a3e635] underline decoration-[#84cc16]/35 underline-offset-4 transition hover:decoration-[#84cc16]";
    return isExternalHref(href) ? <a href={href} target="_blank" rel="noreferrer noopener" className={classes}>{children}</a> : <Link href={href} className={classes}>{children}</Link>;
  },
  ul: ({ children }) => <ul className="my-7 space-y-3 pl-1 text-[18px] leading-8 text-[#d2d5dc]">{children}</ul>,
  ol: ({ children }) => <ol className="my-7 list-decimal space-y-3 pl-7 text-[18px] leading-8 text-[#d2d5dc] marker:font-mono marker:text-[#84cc16]">{children}</ol>,
  li: ({ children, ...props }) => <li {...props} className="relative pl-6 before:absolute before:left-0 before:top-[0.72em] before:size-1.5 before:rounded-full before:bg-[#84cc16]">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-10 border-l-2 border-[#84cc16] bg-[#84cc16]/[0.06] px-6 py-2 font-heading text-xl leading-8 text-white sm:px-8">{children}</blockquote>,
  code: ({ className, children, ...props }) => <code {...props} className={`${className ?? ""} rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.86em] text-[#b9ef65]`}>{children}</code>,
  pre: ({ children }) => <pre className="my-9 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0d12] p-5 text-[14px] leading-7 shadow-2xl [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  hr: () => <hr className="my-14 border-0 border-t border-white/10" />,
  table: ({ children }) => <div className="my-9 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full border-collapse text-left text-[15px]">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-white/[0.05] font-mono text-[11px] uppercase tracking-[0.12em] text-[#84cc16]">{children}</thead>,
  th: ({ children }) => <th className="border-b border-white/10 px-5 py-4 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b border-white/[0.07] px-5 py-4 leading-6 text-[#d2d5dc] last:[tr:last-child_&]:border-b-0">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
};

export function MarkdownArticle({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>;
}
