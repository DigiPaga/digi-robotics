import { Cpu, MonitorPlay, Video } from "lucide-react";
import { CustomDataForm } from "./CustomDataForm";
import { Eyebrow, SectionTitle, shell } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";

const types = [
  { title: "AUDIOVISUAL", copy: "First-person video, synchronized camera views, audio, and demonstrations.", icon: Video },
  { title: "SOFTWARE", copy: "Screen interactions, digital workflows, and interface navigation.", icon: MonitorPlay },
  { title: "HARDWARE", copy: "Tool use, device operation, sensors, wearables, and physical interaction.", icon: Cpu },
];

export function CustomDataSection() {
  return <section id="custom-data" className="scroll-mt-24 py-24 sm:py-32 lg:py-40">
    <div className={shell}>
      <Reveal><Eyebrow>04 / Data on demand</Eyebrow><SectionTitle className="mt-5">Request the data your robot needs.</SectionTitle><p className="mt-6 max-w-2xl text-[19px] leading-[1.5] text-[var(--muted-foreground)] lg:text-[21px]">Define the task, environment, capture method, and acceptance criteria. DigiRobotics will use the request to plan a targeted contributor campaign.</p></Reveal>
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
        {types.map(({ title, copy, icon: Icon }, index) => <a key={title} href="#request-form" className="group min-h-[260px] border border-transparent bg-[var(--surface)] p-7 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:bg-white/[.03] sm:p-9">
          <div className="flex items-start justify-between"><span className="font-mono text-[11px] text-[var(--primary)]">0{index + 1}</span><Icon aria-hidden="true" size={32} className="text-white/55 transition group-hover:text-[var(--primary)]" /></div>
          <h3 className="mt-16 font-heading text-3xl transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{title}</h3><p className="mt-4 max-w-sm text-[17px] leading-6 text-[var(--muted-foreground)]">{copy}</p>
        </a>)}
      </div>
      <CustomDataForm />
    </div>
  </section>;
}
