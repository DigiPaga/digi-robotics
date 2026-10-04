"use client";

import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/syne/800.css";
import "./deck.css";
import { DeckStage } from "./DeckStage";
import { useDeckController } from "./useDeckController";

/**
 * DigiRobotics pitch deck — a native, animated 16:9 presenter. See deck-copy.ts
 * for the words, slides.tsx for layout, deck.css for the visual system, and
 * useDeckController.ts for the keyboard/touch/hash-driven state machine.
 */
export function DeckPresenter() {
  const deck = useDeckController();
  return <DeckStage deck={deck} />;
}
