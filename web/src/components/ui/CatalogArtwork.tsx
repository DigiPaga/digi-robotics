"use client";

import Image from "next/image";
import { useState } from "react";

type CatalogArtworkProps = {
  src: string;
  alt: string;
  label: string;
  sizes: string;
};

export function CatalogArtwork({ src, alt, label, sizes }: CatalogArtworkProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${label} artwork unavailable`}
        className="absolute inset-0 grid place-items-center overflow-hidden bg-[#0e1118] px-6 text-center"
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(132,204,22,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(132,204,22,.08)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div aria-hidden="true" className="absolute size-32 rounded-full border border-[var(--primary)]/15" />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--primary)]">Artwork offline</p>
          <p className="mt-3 font-heading text-lg text-white">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
      onError={() => setFailedSrc(src)}
    />
  );
}
