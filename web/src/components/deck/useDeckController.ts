"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DECK_META, REVEAL_STEPS } from "./deck-copy";

const TOTAL = DECK_META.totalSlides;

function stepsFor(index: number) {
  return REVEAL_STEPS[index] ?? 0;
}

function indexFromHash(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.location.hash.slice(1));
  return Number.isInteger(n) && n >= 1 && n <= TOTAL ? n - 1 : 0;
}

/**
 * Drives the whole presenter: slide/step position, hash deep-links, keyboard and
 * digit-jump input, fullscreen, the elapsed timer, clean mode, the notes panel,
 * the help legend, and cursor auto-hide. A single {index, step} state keeps slide
 * position and reveal-step position atomic, so next()/prev() never race.
 */
export function useDeckController() {
  // This hook only ever runs client-side (see DeckClientOnly's ssr:false), so
  // reading the hash here for the initial state is safe and avoids a flash
  // from slide 1 to whatever slide was deep-linked.
  const [pos, setPos] = useState(() => ({ index: indexFromHash(), step: 0 }));
  const [ready, setReady] = useState(false);
  const [cleanMode, setCleanMode] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);

  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const digitBuf = useRef("");
  const digitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((i: number, s = 0) => {
    const index = Math.max(0, Math.min(TOTAL - 1, i));
    const step = Math.max(0, Math.min(stepsFor(index), s));
    setPos({ index, step });
  }, []);

  const next = useCallback(() => {
    setPos(({ index, step }) => {
      const max = stepsFor(index);
      if (step < max) return { index, step: step + 1 };
      if (index < TOTAL - 1) return { index: index + 1, step: 0 };
      return { index, step };
    });
  }, []);

  const prev = useCallback(() => {
    setPos(({ index, step }) => {
      if (step > 0) return { index, step: step - 1 };
      if (index > 0) {
        const pi = index - 1;
        return { index: pi, step: stepsFor(pi) };
      }
      return { index, step };
    });
  }, []);

  const first = useCallback(() => goTo(0), [goTo]);
  const last = useCallback(() => goTo(TOTAL - 1), [goTo]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  const toggleTimer = useCallback(() => {
    setTimerSeconds(0);
    setTimerRunning((running) => !running);
  }, []);

  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => {
      const next = !open;
      if (helpTimer.current) clearTimeout(helpTimer.current);
      if (next) helpTimer.current = setTimeout(() => setHelpOpen(false), 4500);
      return next;
    });
  }, []);

  const handleDigit = useCallback(
    (d: string) => {
      digitBuf.current += d;
      if (digitTimer.current) clearTimeout(digitTimer.current);
      const commit = () => {
        const n = Number.parseInt(digitBuf.current, 10);
        digitBuf.current = "";
        if (n >= 1 && n <= TOTAL) goTo(n - 1, 0);
      };
      // Only wait for a possible second digit when one could still complete a
      // valid slide number (e.g. "1" could become 10-12); anything else — a
      // second digit, or a first digit no valid number starts with — commits
      // right away, so single-digit jumps feel instant.
      const canExtend = digitBuf.current.length === 1 && Array.from({ length: 10 }, (_, x) => Number(digitBuf.current + x)).some((n) => n >= 1 && n <= TOTAL);
      if (canExtend) digitTimer.current = setTimeout(commit, 600);
      else commit();
    },
    [goTo],
  );

  // Jump to an externally-changed hash (back/forward nav, or a pasted link).
  useEffect(() => {
    const onHash = () => setPos({ index: indexFromHash(), step: 0 });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // One frame after mount, let slide/reveal transitions start running — the
  // very first paint (already on the right slide, see the lazy state above)
  // renders with transitions suppressed so nothing animates in from slide 1.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep the hash in sync so a reload (or a share) returns to the same slide.
  useEffect(() => {
    const hash = `#${pos.index + 1}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [pos.index]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    function resetIdle() {
      setCursorHidden(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setCursorHidden(true), 2500);
    }
    resetIdle();
    window.addEventListener("pointermove", resetIdle);
    window.addEventListener("pointerdown", resetIdle);
    return () => {
      window.removeEventListener("pointermove", resetIdle);
      window.removeEventListener("pointerdown", resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        handleDigit(k);
        return;
      }
      switch (k) {
        case "ArrowRight":
        case "PageDown":
        case " ":
        case "Enter":
          if (k === "Enter" && (e.target as HTMLElement | null)?.closest("a,button")) return;
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          first();
          break;
        case "End":
          e.preventDefault();
          last();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "n":
        case "N":
          setNotesOpen((o) => !o);
          break;
        case "t":
        case "T":
          toggleTimer();
          break;
        case "h":
        case "H":
          setCleanMode((c) => !c);
          break;
        case "?":
          toggleHelp();
          break;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, prev, first, last, handleDigit, toggleFullscreen, toggleTimer, toggleHelp]);

  return {
    index: pos.index,
    step: pos.step,
    total: TOTAL,
    atStart: pos.index === 0 && pos.step === 0,
    atEnd: pos.index === TOTAL - 1 && pos.step >= stepsFor(pos.index),
    ready,
    cleanMode,
    notesOpen,
    helpOpen,
    fullscreen,
    timerRunning,
    timerSeconds,
    cursorHidden,
    goTo,
    next,
    prev,
    first,
    last,
    setNotesOpen,
    setCleanMode,
  };
}

export type DeckController = ReturnType<typeof useDeckController>;
