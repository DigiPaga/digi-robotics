import type { Metadata } from "next";
import { DeckClientOnly } from "@/components/deck/DeckClientOnly";
import { DECK_META } from "@/components/deck/deck-copy";

export const metadata: Metadata = {
  title: DECK_META.title,
  description: DECK_META.description,
  alternates: { canonical: "https://digirobotics.xyz/deck" },
  openGraph: {
    title: DECK_META.title,
    description: DECK_META.description,
    url: "https://digirobotics.xyz/deck",
    type: "website",
    images: [{ url: DECK_META.ogImage, alt: "DigiRobotics — train robots with your phone, get paid in stablecoins" }],
  },
  twitter: {
    card: "summary_large_image",
    title: DECK_META.title,
    description: DECK_META.description,
    images: [DECK_META.ogImage],
  },
};

// Native, animated 16:9 presenter — see components/deck/ for the engine and copy.
// No Navbar/Footer here: this route renders nothing else the site's layout adds
// (the root layout never injects chrome itself — every route opts in per page).
export default function DeckPage() {
  return <DeckClientOnly />;
}
