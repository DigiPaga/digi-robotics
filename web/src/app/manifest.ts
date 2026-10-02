import type { MetadataRoute } from "next";

// /manifest.json and /manifest.webmanifest both 404'd, and layout.tsx referenced
// neither. Next.js serves this file's export at /manifest.webmanifest automatically. Reuses
// the existing favicon rather than commissioning new icon artwork (fix, not redesign).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DigiRobotics — Egocentric Data for Robotics",
    short_name: "DigiRobotics",
    description: "Capture real-world skills from your point of view. Build the training data robotics teams need.",
    start_url: "/",
    display: "standalone",
    background_color: "#171b25",
    theme_color: "#171b25",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
