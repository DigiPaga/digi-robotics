import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/syne/700.css";
import "@fontsource/ubuntu/500.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthFlowProvider } from "@/components/auth/AuthFlowProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://digirobotics.xyz"),
  title: "DigiRobotics — Egocentric Data for Robotics",
  description:
    "Capture real-world skills from your point of view. Build the training data robotics teams need.",
  openGraph: {
    title: "DigiRobotics — Egocentric Data for Robotics",
    description:
      "First-person human activity, structured for perception, planning, and embodied AI.",
    url: "https://digirobotics.xyz",
    siteName: "DigiRobotics.xyz",
    images: [{
      url: "/digirobotics/hero/pov-thermostat.webp",
      width: 1586,
      height: 992,
      alt: "First-person capture of a person installing a control panel",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiRobotics — Egocentric Data for Robotics",
    description: "Real-world skills, captured through human eyes.",
    images: ["/digirobotics/hero/pov-thermostat.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthFlowProvider>{children}</AuthFlowProvider></body>
    </html>
  );
}
