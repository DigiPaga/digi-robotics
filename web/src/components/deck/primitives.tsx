"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { ImageMedia, Motif } from "./deck-copy";

/** Staggered entrance wrapper. Visible once the parent slide carries `.is-active`. */
export function Reveal({ children, d = 0, className = "", as = "div", style }: { children: ReactNode; d?: number; className?: string; as?: "div" | "p" | "span"; style?: CSSProperties }) {
  const Tag = as;
  return (
    <Tag className={`deck-reveal ${className}`} style={{ "--d": d, ...style } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Click/step-gated reveal, used on slides with a clicker-advanced sequence. */
export function RevealStep({ children, inView, className = "" }: { children: ReactNode; inView: boolean; className?: string }) {
  return <div className={`deck-reveal-step ${inView ? "is-in" : ""} ${className}`}>{children}</div>;
}

/** A paragraph built from inline segments, some of which are highlighted lime or bold. */
export function RichText({ parts, as = "p", className = "" }: { parts: { text: string; lime?: boolean; strong?: boolean }[]; as?: "p" | "span"; className?: string }) {
  const Tag = as;
  return (
    <Tag className={className}>
      {parts.map((p, i) => (
        <span key={i} className={p.lime ? "deck-lime" : undefined} style={p.strong ? { color: "var(--deck-ink)", fontWeight: 600 } : undefined}>
          {p.text}
        </span>
      ))}
    </Tag>
  );
}

export function Kicker({ lines }: { lines: string[] }) {
  return (
    <h1 className="deck-kicker deck-reveal" style={{ "--d": 0 } as CSSProperties}>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </h1>
  );
}

export function Headline({ parts, size = "md", d = 1, inline = false }: { parts: { text: string; lime?: boolean }[]; size?: "md" | "lg"; d?: number; inline?: boolean }) {
  return (
    <h2 className={`deck-h2 ${size === "lg" ? "deck-h2--lg" : ""} ${inline ? "deck-h2--inline" : ""} deck-reveal`} style={{ "--d": d } as CSSProperties}>
      {parts.map((p, i) => (
        <span key={i} className={p.lime ? "deck-lime" : undefined}>
          {p.text}
        </span>
      ))}
    </h2>
  );
}

export function ImageFrame({ media, priority = false, heightPx = 640, d = 2 }: { media: ImageMedia; priority?: boolean; heightPx?: number; d?: number }) {
  return (
    <div className="deck-frame deck-reveal deck-reveal--media" style={{ "--d": d, height: heightPx } as CSSProperties}>
      <Image src={media.src} alt={media.alt} fill sizes="880px" className="object-contain p-4" priority={priority} />
    </div>
  );
}

export function OrbitalMotif({ motif }: { motif: Motif }) {
  const sizePx = (motif.size / 100) * 1920;
  const style: CSSProperties = {
    width: sizePx,
    height: sizePx,
    opacity: motif.opacity,
    [motif.x]: -sizePx * 0.22,
    [motif.y]: -sizePx * 0.26,
  };
  const rings = Array.from({ length: motif.rings }, (_, i) => 48 - i * 15);
  return (
    <svg className="deck-motif" style={style} viewBox="0 0 100 100" fill="none" stroke="#ffffff" strokeWidth="0.2" aria-hidden="true">
      {rings.map((r, i) => (
        <circle key={r} cx="50" cy="50" r={r} style={{ "--ri": i } as CSSProperties} />
      ))}
    </svg>
  );
}

export function StepNum({ children }: { children: ReactNode }) {
  return <span className="deck-step-num">{children}</span>;
}

export function MonoLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`deck-mono ${className}`}>{children}</p>;
}

export function PartnerLockup({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <div className="deck-lockup">
      <div style={{ position: "relative", width: 140, height }}>
        <Image src={src} alt={alt} fill sizes="140px" className="object-contain object-left" />
      </div>
    </div>
  );
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

/** Count-up for the market-size figures. Reduced motion snaps straight to the end value. */
export function CountUp({ active, to, duration = 900, prefix = "", suffix = "", decimals = 0 }: { active: boolean; to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [value, setValue] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (!active) {
      ran.current = false;
      return;
    }
    if (ran.current) return;
    ran.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const id = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);

  const display = active ? value : 0;
  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}
