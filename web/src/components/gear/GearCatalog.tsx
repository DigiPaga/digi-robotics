"use client";

import { useId, useState } from "react";
import { Camera, CircleGauge, Code2, Lightbulb, LoaderCircle, Mic2, Move3d } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { secondaryAction } from "@/components/ui/Primitives";

const categories = [
  "Recording Devices",
  "Mounting & Stabilization",
  "Audio & Communication",
  "Motion Capture & Sensors",
  "Lighting & Environment",
  "Software & Processing",
] as const;

type Category = (typeof categories)[number];
type GearItem = { name: string; description: string; category: Category };

const categoryIcons: Record<Category, LucideIcon> = {
  "Recording Devices": Camera,
  "Mounting & Stabilization": Move3d,
  "Audio & Communication": Mic2,
  "Motion Capture & Sensors": CircleGauge,
  "Lighting & Environment": Lightbulb,
  "Software & Processing": Code2,
};

const items: GearItem[] = [
  { category: "Recording Devices", name: "Smartphone (iPhone 15+/Android flagship)", description: "A high-resolution everyday camera for reliable first-person video capture." },
  { category: "Recording Devices", name: "GoPro Hero 12/13", description: "A rugged action camera for wide-angle tasks in active environments." },
  { category: "Recording Devices", name: "Insta360 GO 3", description: "A compact wearable camera for lightweight hands-free recording." },
  { category: "Recording Devices", name: "DJI Osmo Action 4", description: "A stabilized action camera suited to long, movement-heavy captures." },
  { category: "Recording Devices", name: "Meta Quest 3 / Apple Vision Pro", description: "Spatial headsets for first-person mixed-reality and scene understanding data." },
  { category: "Recording Devices", name: "Intel RealSense D435i/D455", description: "Depth cameras for synchronized RGB, motion, and spatial measurements." },
  { category: "Recording Devices", name: "OAK-D Lite (Luxonis)", description: "An edge AI camera for stereo depth and on-device visual processing." },
  { category: "Recording Devices", name: "Structure Sensor 3", description: "A mobile depth sensor for scanning rooms, objects, and workspaces." },
  { category: "Mounting & Stabilization", name: "Head Strap Mount", description: "A hands-free head mount for consistent eye-level point-of-view footage." },
  { category: "Mounting & Stabilization", name: "Chest Harness Mount", description: "A stable chest-level mount for longer physical task recordings." },
  { category: "Mounting & Stabilization", name: "Wrist Mount Straps", description: "Wearable straps for close-range hand and tool interaction capture." },
  { category: "Mounting & Stabilization", name: "DJI Osmo Mobile 8", description: "A smartphone gimbal for smooth walking and inspection sequences." },
  { category: "Mounting & Stabilization", name: "Insta360 Flow 2 Pro", description: "A portable tracking gimbal for stabilized mobile capture sessions." },
  { category: "Mounting & Stabilization", name: "Magnetic Quick-Release Mounts", description: "Fast-swapping mounts for moving one camera between capture positions." },
  { category: "Mounting & Stabilization", name: "Flexible Tripod (GorillaPod-style)", description: "An adaptable support for unusual angles and compact workspaces." },
  { category: "Audio & Communication", name: "Wireless Lavalier Microphone (DJI Mic 2 / Rode Wireless GO III)", description: "Clean wireless voice and environmental audio for mobile tasks." },
  { category: "Audio & Communication", name: "Shotgun Microphone (Rode VideoMic)", description: "Directional audio capture that reduces distracting off-axis sound." },
  { category: "Audio & Communication", name: "Bone Conduction Headset Microphone", description: "Hands-free communication that keeps the contributor aware of surroundings." },
  { category: "Audio & Communication", name: "3.5mm Audio Adapter", description: "A compact adapter for connecting supported microphones to capture devices." },
  { category: "Motion Capture & Sensors", name: "Xsens Link Motion Capture Suit", description: "Full-body inertial motion capture for precise human movement datasets." },
  { category: "Motion Capture & Sensors", name: "MANUS Metagloves", description: "Detailed finger and hand tracking for dexterous manipulation tasks." },
  { category: "Motion Capture & Sensors", name: "Rokoko Smartsuit Pro + Smartgloves", description: "A wearable body-and-hand capture system for coordinated motion sequences." },
  { category: "Motion Capture & Sensors", name: "Custom IMU Sensor Nodes (ESP32-C3 + MPU6050)", description: "Configurable sensor nodes for task-specific motion and orientation signals." },
  { category: "Motion Capture & Sensors", name: "Apple Watch / Fitbit / Garmin", description: "Consumer wearables for time-aligned movement and activity measurements." },
  { category: "Motion Capture & Sensors", name: "Smart Insoles (Sensoria, Moticon)", description: "Pressure-aware insoles for gait, balance, and foot-loading data." },
  { category: "Lighting & Environment", name: "Portable LED Light Panel (Aputure MC / Lume Cube)", description: "Compact adjustable lighting for consistent indoor capture quality." },
  { category: "Lighting & Environment", name: "Headlamp with Adjustable Beam", description: "Wearable illumination for low-light, hands-busy environments." },
  { category: "Lighting & Environment", name: "Ring Light with Smartphone Mount", description: "Even frontal lighting with an integrated mobile capture position." },
  { category: "Software & Processing", name: "3D Scanning Apps (Polycam, Metaroom, 3D Scanner App, Skanect)", description: "Mobile and desktop tools for turning environments into spatial assets." },
  { category: "Software & Processing", name: "Visual Model Software (YOLOv10, OpenCV, MediaPipe, Apple Vision Framework)", description: "Vision tooling for detection, tracking, pose estimation, and analysis." },
];

type FormState = "idle" | "submitting" | "success" | "error";

function NotifyForm({ item }: { item: string }) {
  const id = useId();
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setState("submitting");
    setMessage("");
    const email = String(new FormData(form).get("email") ?? "");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "gear_waitlist", item }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not add you right now. Please try again.");
      setState("success");
      setMessage("You’re on this gear waitlist.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "We could not add you right now. Please try again.");
    }
  }

  return <form onSubmit={submit} className="mt-6" aria-describedby={`${id}-status`}>
    <label htmlFor={`${id}-email`} className="sr-only">Email address for {item}</label>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input id={`${id}-email`} name="email" type="email" autoComplete="email" required disabled={state === "success"} placeholder="Email address" className="min-h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-[var(--page-bg)] px-4 text-[14px] text-white placeholder:text-white/35 transition-colors duration-300 ease-out focus:border-[var(--primary)] focus:outline-none disabled:opacity-60" />
      <button disabled={state === "submitting" || state === "success"} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-4 text-[13px] font-semibold text-white disabled:cursor-default disabled:border-[var(--primary)]/40 disabled:text-[var(--primary)] ${secondaryAction}`}>
        {state === "submitting" ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
        {state === "submitting" ? "Joining…" : state === "success" ? "✓ Added" : "Notify me"}
      </button>
    </div>
    <p id={`${id}-status`} role="status" aria-live="polite" className={`mt-2 min-h-5 text-[12px] leading-5 ${state === "error" ? "text-[#ff9e91]" : "text-[var(--primary)]"}`}>{message}</p>
  </form>;
}

export function GearCatalog() {
  const [filter, setFilter] = useState<Category | "All">("All");
  const visible = filter === "All" ? items : items.filter((item) => item.category === filter);

  return <>
    <div className="mt-10 flex flex-wrap gap-2" aria-label="Filter gear by category">
      {(["All", ...categories] as const).map((category) => <button key={category} onClick={() => setFilter(category)} aria-pressed={filter === category} className={`min-h-11 rounded-full border px-4 text-[13px] font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 ${filter === category ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--page-bg)]" : "border-white/15 text-white/70 hover:border-[var(--primary)]/50 hover:bg-white/5 hover:text-white"}`}>{category}</button>)}
    </div>
    <p className="mt-5 font-mono text-[11px] uppercase tracking-[.14em] text-white/45">Showing {visible.length} items</p>
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((item) => {
        const Icon = categoryIcons[item.category];
        return <article key={item.name} className="group flex min-h-full flex-col rounded-2xl border border-white/[.09] bg-[var(--surface)] p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)]/30 focus-within:border-[var(--primary)]/30 sm:p-6">
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/20 bg-[var(--page-bg)] text-center">
            <div><Icon aria-hidden="true" className="mx-auto text-[var(--primary)]" size={30} /><p className="mt-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/45">Product imagery coming soon</p></div>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/45">{item.category}</p><span className="shrink-0 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/[.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-[var(--primary)]">Coming soon</span></div>
          <h2 className="mt-4 font-heading text-[22px] leading-[1.08] transition-colors duration-300 ease-out group-hover:text-[var(--primary)]">{item.name}</h2>
          <p className="mt-3 flex-1 text-[15px] leading-6 text-[var(--muted-foreground)]">{item.description}</p>
          <NotifyForm item={item.name} />
        </article>;
      })}
    </div>
  </>;
}
