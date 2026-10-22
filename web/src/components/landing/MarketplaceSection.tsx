"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Eyebrow, PrimaryLink, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const CTA_LABEL = "REQUEST ACCESS";

export const MARKETPLACE_CATEGORIES = [
  "All",
  "Domestic/Hospitality",
  "Industrial",
  "Manufacturing",
  "Hazardous",
  "Logistics",
  "Assembling",
  "Healthcare",
  "Agriculture",
  "Construction",
  "Urban work",
  "Hardware",
  "Maritime",
  "Entertainment",
] as const;

type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

type Dataset = {
  title: string;
  category: MarketplaceCategory;
  copy: string;
  image: string;
  alt: string;
};

const datasets: Dataset[] = [
  {
    title: "NUCLEAR FACILITY SAFETY INSPECTION",
    category: "Hazardous",
    copy: "Radiation monitoring, containment verification, and emergency protocol drill execution.",
    image: "/marketplace/nuclear-facility-safety.png",
    alt: "Head-mounted point-of-view capture of a nuclear facility safety inspection",
  },
  {
    title: "HIGH-VOLTAGE TRANSFORMER INSPECTION",
    category: "Hazardous",
    copy: "Electrical substation maintenance, thermal imaging, and safety protocol verification.",
    image: "/marketplace/high-voltage-inspection.png",
    alt: "Technician inspecting a high-voltage transformer with thermal imaging equipment",
  },
  {
    title: "RAILWAY SIGNAL SYSTEM INSPECTION",
    category: "Logistics",
    copy: "Track signal verification, switching mechanism testing, and control system checks.",
    image: "/marketplace/railway-signal-inspection.jpg",
    alt: "Railway signal system inspection along an active track section",
  },
  {
    title: "DATA CENTER RACK INSTALLATION",
    category: "Hardware",
    copy: "Server deployment, cable management, cooling system verification, and power distribution.",
    image: "/marketplace/data-center-rack-installation.png",
    alt: "Data center rack installation with server deployment and cable management",
  },
  {
    title: "WATER TREATMENT FACILITY MONITORING",
    category: "Industrial",
    copy: "Chemical level verification, filtration system inspection, and water quality testing.",
    image: "/marketplace/water-facility-monitoring.png",
    alt: "Water treatment facility monitoring with filtration and water quality testing controls",
  },
  {
    title: "INDUSTRIAL ROBOT ARM CALIBRATION",
    category: "Manufacturing",
    copy: "Manufacturing line robot setup, precision alignment, sensor calibration, and torque verification.",
    image: "/marketplace/industrial-robot-calibration.jpg",
    alt: "Industrial robot arm calibration on a manufacturing line",
  },
  {
    title: "VEHICLE REFUELING PROTOCOL",
    category: "Logistics",
    copy: "Safe fuel handling, tank filling procedures, and hazardous material containment checks.",
    image: "/marketplace/vehicle-refueling-protocol.png",
    alt: "Vehicle refueling protocol with safe fuel handling at a service station",
  },
  {
    title: "SMART VEHICLE ACCESS",
    category: "Urban work",
    copy: "Biometric scanner setup, keyless entry calibration, and security protocol configuration.",
    image: "/marketplace/smart-vehicle-access.png",
    alt: "Smart vehicle access setup with a keyless entry and biometric scanner",
  },
  {
    title: "HVAC MAINTENANCE",
    category: "Domestic/Hospitality",
    copy: "Air conditioning filter cleaning, system setup, and airflow optimization procedures.",
    image: "/marketplace/hvac-maintenance.jpeg",
    alt: "HVAC maintenance technician servicing an air conditioning unit",
  },
];

function CategoryTab({
  category,
  selected,
  onSelect,
}: {
  category: MarketplaceCategory;
  selected: MarketplaceCategory;
  onSelect: (category: MarketplaceCategory) => void;
}) {
  const active = selected === category;
  return (
    <button
      onClick={() => onSelect(category)}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-300 ease-out ${active ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--page-bg)]" : "border-white/15 text-white/70 hover:border-[var(--primary)]/50 hover:bg-white/5 hover:text-white"}`}
    >
      {category}
    </button>
  );
}

function CategoryTabs({
  categories,
  selected,
  onSelect,
}: {
  categories: readonly MarketplaceCategory[];
  selected: MarketplaceCategory;
  onSelect: (category: MarketplaceCategory) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflowStart, setOverflowStart] = useState(categories.length);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const update = () => {
      const width = container.offsetWidth;
      const moreEl = measure.querySelector<HTMLElement>("[data-tab-more]");
      const moreW = moreEl ? moreEl.offsetWidth + 8 : 0;
      const tabs = Array.from(measure.querySelectorAll<HTMLElement>("[data-tab-measure]"));
      let used = 0;
      let fit = tabs.length;
      for (let i = 0; i < tabs.length; i++) {
        const w = tabs[i].offsetWidth;
        const gap = i > 0 ? 8 : 0;
        if (used + w + gap > width) {
          fit = i;
          break;
        }
        used += w + gap;
      }
      if (fit < tabs.length) {
        used = 0;
        fit = tabs.length;
        const limit = width - moreW;
        for (let i = 0; i < tabs.length; i++) {
          const w = tabs[i].offsetWidth;
          const gap = i > 0 ? 8 : 0;
          if (used + w + gap > limit) {
            fit = i;
            break;
          }
          used += w + gap;
        }
        if (fit === tabs.length) fit = Math.max(tabs.length - 1, 0);
      }
      setOverflowStart(fit);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const visible = categories.slice(0, overflowStart);
  const overflow = categories.slice(overflowStart);
  const hasOverflow = overflow.length > 0;

  return (
    <>
      <div
        ref={measureRef}
        className="absolute -left-[9999px] top-0 z-[-1] flex flex-nowrap gap-2"
        aria-hidden="true"
      >
        {categories.map((category) => (
          <button
            key={category}
            data-tab-measure
            className="min-h-11 shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium"
          >
            {category}
          </button>
        ))}
        <button
          data-tab-more
          className="min-h-11 shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium text-white/70 border-white/15 flex items-center gap-2"
        >
          More <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="relative mt-10 hidden md:flex">
        <div ref={containerRef} className="flex items-center gap-2">
          {visible.map((category) => (
            <CategoryTab key={category} category={category} selected={selected} onSelect={onSelect} />
          ))}
          {hasOverflow && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((prev) => !prev);
              }}
              aria-pressed={moreOpen}
              aria-haspopup="true"
              className="min-h-11 shrink-0 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-[var(--primary)]/50 hover:bg-white/5 hover:text-white flex items-center gap-2"
            >
              More <ChevronDown size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        {hasOverflow && moreOpen && (
          <div className="absolute left-0 top-[calc(100%+10px)] w-auto min-w-[160px] rounded-xl border border-white/10 bg-[#171d29] p-3 shadow-2xl z-50 flex flex-col gap-2">
            {overflow.map((category) => (
              <CategoryTab key={category} category={category} selected={selected} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-nowrap gap-2 overflow-x-auto md:hidden pb-2">
        {categories.map((category) => (
          <CategoryTab key={category} category={category} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}

export function MarketplaceSection() {
  const [selected, setSelected] = useState<MarketplaceCategory>("All");
  const filtered = useMemo(
    () => (selected === "All" ? datasets : datasets.filter((d) => d.category === selected)),
    [selected]
  );
  const isEmpty = filtered.length === 0 && selected !== "All";
  return <section id="marketplace" className="scroll-mt-24 py-24 sm:py-32 lg:py-40">
    <div className={shell}>
      <Reveal>
        <Eyebrow>02 / Training data marketplace</Eyebrow>
        <SectionTitle className="mt-5">5.4 Billion Smartphones. One New Way to Earn.</SectionTitle>
        <p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">
          Embodied AI needs enormous amounts of audio-visual data to make robots useful. This marketplace gives both creators and robotics builders access to the quality egocentric data embodied AI requires.
        </p>
        <p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">
          Enter the marketplace and let our AI agent secure stablecoin payments while it supervises the preview of first-person task data — built for perception, planning, manipulation, and embodied AI research.
        </p>
      </Reveal>

      <CategoryTabs
        categories={MARKETPLACE_CATEGORIES}
        selected={selected}
        onSelect={setSelected}
      />

      {isEmpty ? (
        <div className="mt-10 grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.015] text-center">
          <div className="max-w-xs px-6">
            <p className="font-mono text-[13px] leading-6 text-[var(--muted-foreground)]">
              No campaigns yet in this category —{" "}
              <a
                href="#custom-data"
                className="relative text-[var(--primary)] after:absolute after:inset-x-0 after:bottom-[1px] after:h-[1px] after:bg-[var(--primary)] after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                request custom data
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ title, category, copy, image, alt }, index) => (
            <article key={title} className="group overflow-hidden rounded-2xl border border-white/[.09] bg-[var(--surface)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 focus-within:border-[var(--primary)]/30">
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-[#161c29]">
                <Image
                  src={image}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <span className="absolute left-4 top-3 rounded-full bg-[#0e1118]/80 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">
                  POV / {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[.15em] text-[var(--primary)]">{category}</p>
                <h3 className="mt-3 font-heading text-2xl leading-[1.05] transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h3>
                <p className="mt-4 text-[17px] leading-6 text-[var(--muted-foreground)]">{copy}</p>
                <a href="#custom-data" className="relative mt-6 inline-flex min-h-11 items-center text-[13px] font-semibold tracking-[.08em] text-white transition-colors duration-300 ease-out after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-[var(--primary)] after:transition-transform after:duration-300 after:ease-out hover:text-[var(--primary)] hover:after:scale-x-100">
                  {CTA_LABEL} →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mt-12"><PrimaryLink href="#join">Enter the marketplace</PrimaryLink></div>
    </div>
  </section>;
}
