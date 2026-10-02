import Image from "next/image";
import {
  Eyebrow,
  PrimaryLink,
  SectionTitle,
  shell,
} from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

type GearCard = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  alt: string;
  status: string;
};

// Images are served from web/public/gear/ and rendered in a fixed-height,
// object-cover container so any source aspect ratio crops cleanly without distortion.
const gear: GearCard[] = [
  {
    title: "SENSORIAL HEAD-MOUNTED CAMERA",
    subtitle: "Sensorial Head Camera",
    description:
      "Stable, hands-free first-person capture designed for continuous task recording.",
    image: "/gear/head-mounted-phone-holder.jpg",
    alt: "Sensorial head-mounted camera worn by a contributor for hands-free first-person recording",
    status: "COMING SOON",
  },
  {
    title: "CHEST-MOUNT CAPTURE HARNESS",
    subtitle: "Ergonomic Body Rig",
    description:
      "Distributed weight harness for all-day comfort during industrial and field data collection.",
    image: "/gear/chest-mount-capture-harness.png",
    alt: "Worker wearing a chest-mounted capture harness on an ergonomic body rig",
    status: "AVAILABLE",
  },
  {
    title: "SMART GLOVES",
    subtitle: "Haptic & Motion Tracking",
    description:
      "Capture fine motor skills, grip pressure, and precise hand movements for dexterity training.",
    image: "/gear/smart-gloves.jpeg",
    alt: "Smart gloves used for haptic and motion tracking of fine hand movements",
    status: "AVAILABLE",
  },
  {
    title: "MOTION AND SENSOR KIT",
    subtitle: "Advanced Telemetry",
    description:
      "Full-body spatial tracking and environmental sensor fusion for comprehensive egocentric data.",
    image: "/gear/motion-sensor-kit.png",
    alt: "Contributor wearing motion and environmental sensor gear for full-body spatial tracking",
    status: "AVAILABLE",
  },
];

function statusPill(status: string) {
  return status === "AVAILABLE"
    ? "border-[var(--primary)]/30 bg-[var(--primary)]/[.08] text-[var(--primary)]"
    : "border-white/15 bg-white/[.04] text-white/55";
}

export function GearSection() {
  return (
    <section
      id="capture-gear"
      className="scroll-mt-24 border-y border-white/[.07] bg-[#141923] py-24 sm:py-32 lg:py-40"
    >
      <div className={shell}>
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <Reveal>
            <Eyebrow>05 / Capture equipment</Eyebrow>
            <SectionTitle className="mt-5">
              Gear up for the next wave of data creation.
            </SectionTitle>
            <p className="mt-6 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">
              Explore cameras, holders, wearables, and sensors designed for
              stable first-person capture.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/digirobotics/gear/capture-kit.webp"
                alt="Head mount, chest harness, depth camera, and motion sensors arranged on a workbench"
                fill
                sizes="(max-width: 1024px) 100vw, 52vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          {gear.map(
            ({ title, subtitle, description, image, alt, status }, index) => (
              <article
                key={title}
                className="group flex flex-col border border-transparent bg-[var(--surface)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30"
              >
                <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-[#161c29]">
                  <Image
                    src={image}
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-3 rounded-full bg-[#0e1118]/80 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">
                    0{index + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/45">
                      {subtitle}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] ${statusPill(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-xl leading-tight transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">
                    {title}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-6 text-[var(--muted-foreground)]">
                    {description}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
        <div className="mt-10">
          <PrimaryLink href="/gear">Explore all capture gear</PrimaryLink>
        </div>
      </div>
    </section>
  );
}
