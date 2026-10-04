import { redirect } from "next/navigation";

export const metadata = {
  title: "DigiRobotics Pitch Deck",
  description: "The future of agentic commerce and Physical AI training data.",
};

// The deck is a static HTML document served from /public.
export default function DeckPage() {
  redirect("/pitch-deck/index.html");
}
