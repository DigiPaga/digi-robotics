"use client";

import dynamic from "next/dynamic";

// The presenter reads `location.hash` for its initial slide and owns a few
// browser-only APIs (fullscreen, matchMedia). Skipping SSR for it avoids any
// server/client hydration mismatch on the deep-linked slide — there is nothing
// here search engines need to index beyond the page's own metadata.
const DeckPresenter = dynamic(() => import("./DeckPresenter").then((m) => m.DeckPresenter), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#0e1118" }} />,
});

export function DeckClientOnly() {
  return <DeckPresenter />;
}
