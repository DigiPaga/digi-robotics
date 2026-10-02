import Image from "next/image";
import { Eyebrow, PrimaryLink, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const CTA_LABEL = "REQUEST ACCESS";

type Dataset = { title: string; category: string; copy: string; image: string; alt: string };
const datasets: Dataset[] = [
  { title: "NUCLEAR FACILITY SAFETY INSPECTION", category: "ENERGY", copy: "Radiation monitoring, containment verification, and emergency protocol drill execution.", image: "/marketplace/nuclear-facility-safety.png", alt: "Head-mounted point-of-view capture of a nuclear facility safety inspection" },
  { title: "HIGH-VOLTAGE TRANSFORMER INSPECTION", category: "INFRASTRUCTURE", copy: "Electrical substation maintenance, thermal imaging, and safety protocol verification.", image: "/marketplace/high-voltage-inspection.png", alt: "Technician inspecting a high-voltage transformer with thermal imaging equipment" },
  { title: "RAILWAY SIGNAL SYSTEM INSPECTION", category: "TRANSPORTATION", copy: "Track signal verification, switching mechanism testing, and control system checks.", image: "/marketplace/railway-signal-inspection.jpg", alt: "Railway signal system inspection along an active track section" },
  { title: "DATA CENTER RACK INSTALLATION", category: "TECHNOLOGY", copy: "Server deployment, cable management, cooling system verification, and power distribution.", image: "/marketplace/data-center-rack-installation.png", alt: "Data center rack installation with server deployment and cable management" },
  { title: "WATER TREATMENT FACILITY MONITORING", category: "INFRASTRUCTURE", copy: "Chemical level verification, filtration system inspection, and water quality testing.", image: "/marketplace/water-facility-monitoring.png", alt: "Water treatment facility monitoring with filtration and water quality testing controls" },
  { title: "INDUSTRIAL ROBOT ARM CALIBRATION", category: "MANUFACTURING", copy: "Manufacturing line robot setup, precision alignment, sensor calibration, and torque verification.", image: "/marketplace/industrial-robot-calibration.jpg", alt: "Industrial robot arm calibration on a manufacturing line" },
  { title: "VEHICLE REFUELING PROTOCOL", category: "LOGISTICS", copy: "Safe fuel handling, tank filling procedures, and hazardous material containment checks.", image: "/marketplace/vehicle-refueling-protocol.png", alt: "Vehicle refueling protocol with safe fuel handling at a service station" },
  { title: "SMART VEHICLE ACCESS", category: "AUTOMOTIVE", copy: "Biometric scanner setup, keyless entry calibration, and security protocol configuration.", image: "/marketplace/smart-vehicle-access.png", alt: "Smart vehicle access setup with a keyless entry and biometric scanner" },
  { title: "HVAC MAINTENANCE", category: "FACILITIES", copy: "Air conditioning filter cleaning, system setup, and airflow optimization procedures.", image: "/marketplace/hvac-maintenance.jpeg", alt: "HVAC maintenance technician servicing an air conditioning unit" },
];

export function MarketplaceSection() {
  return <section id="marketplace" className="scroll-mt-24 py-24 sm:py-32 lg:py-40">
    <div className={shell}>
      <Reveal><Eyebrow>02 / Training data marketplace</Eyebrow><SectionTitle className="mt-5">5.4 Billion Smartphones. One New Way to Earn.</SectionTitle><p className="mt-6 max-w-3xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">The next era of content creation is robotics training data. Get paid in stablecoins for capturing it. Preview first-person task data designed for perception, planning, manipulation, and embodied AI research.</p></Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {datasets.map(({ title, category, copy, image, alt }, index) => <article key={title} className="group overflow-hidden rounded-2xl border border-white/[.09] bg-[var(--surface)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 focus-within:border-[var(--primary)]/30">
          <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-[#161c29]">
            <Image src={image} alt={alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
            <span className="absolute left-4 top-3 rounded-full bg-[#0e1118]/80 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">POV / {String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[.15em] text-[var(--primary)]">{category}</p>
            <h3 className="mt-3 font-heading text-2xl leading-[1.05] transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h3>
            <p className="mt-4 text-[17px] leading-6 text-[var(--muted-foreground)]">{copy}</p>
            <a href="#custom-data" className="relative mt-6 inline-flex min-h-11 items-center text-[13px] font-semibold tracking-[.08em] text-white transition-colors duration-300 ease-out after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-[var(--primary)] after:transition-transform after:duration-300 after:ease-out hover:text-[var(--primary)] hover:after:scale-x-100">{CTA_LABEL} →</a>
          </div>
        </article>)}
      </div>
      <div className="mt-12"><PrimaryLink href="#join">Enter the marketplace</PrimaryLink></div>
    </div>
  </section>;
}
