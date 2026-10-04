"use client";

import { SPEAKER_NOTES } from "./deck-copy";
import type { DeckController } from "./useDeckController";

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const LEGEND: [string, string][] = [
  ["→ / Space / PgDn", "Next"],
  ["← / PgUp", "Previous"],
  ["Home / End", "First / last slide"],
  ["0-9", "Jump to slide"],
  ["F", "Fullscreen"],
  ["N", "Notes"],
  ["T", "Timer start/reset"],
  ["H", "Clean mode"],
  ["?", "This legend"],
];

/** Speaker notes panel and the auto-hiding key legend. Both stay out of clean mode. */
export function DeckChrome({ deck }: { deck: DeckController }) {
  if (deck.cleanMode) return null;

  return (
    <>
      <div className={`deck-notes ${deck.notesOpen ? "is-open" : ""}`} aria-hidden={!deck.notesOpen}>
        <p>{SPEAKER_NOTES[deck.index]}</p>
        <span className="deck-notes-timer">{deck.timerRunning || deck.timerSeconds > 0 ? formatTimer(deck.timerSeconds) : "T · start timer"}</span>
      </div>

      <div className={`deck-legend ${deck.helpOpen ? "is-open" : ""}`} aria-hidden={!deck.helpOpen}>
        {LEGEND.map(([key, label]) => (
          <span key={key}>
            <kbd>{key}</kbd>
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
