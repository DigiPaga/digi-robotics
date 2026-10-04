"use client";

import Image from "next/image";
import type { MouseEvent, TouchEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { DeckChrome } from "./DeckChrome";
import { SLIDES } from "./deck-copy";
import { SLIDE_COMPONENTS } from "./slides";
import type { DeckController } from "./useDeckController";

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const SWIPE_THRESHOLD = 56;

function slideHasImage(slide: unknown): slide is { image: { src: string } } {
  return typeof slide === "object" && slide !== null && "image" in slide;
}

export function DeckStage({ deck }: { deck: DeckController }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function measure() {
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Warm the next slide's image so an advance never shows a flash of nothing.
  useEffect(() => {
    const upcoming = SLIDES[deck.index + 1];
    if (upcoming && slideHasImage(upcoming)) {
      const img = new window.Image();
      img.src = upcoming.image.src;
    }
  }, [deck.index]);

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) deck.next();
    else deck.prev();
  }

  // Left third goes back, right third goes forward — real links/buttons underneath
  // (arrows, the slide-12 CTAs) handle their own clicks and are excluded here.
  function onStageClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) deck.prev();
    else if (x > third * 2) deck.next();
  }

  return (
    <div
      className={`deck-root ${deck.cleanMode ? "deck-clean" : ""} ${deck.cursorHidden ? "deck-cursor-hidden" : ""}`}
      data-ready={deck.ready}
      onClick={onStageClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div ref={canvasRef} className="deck-canvas" style={{ transform: `scale(${scale})` }}>
        {SLIDE_COMPONENTS.map((SlideComponent, i) => {
          const pos = i === deck.index ? "active" : i < deck.index ? "before" : "after";
          return (
            <div key={i} className="deck-slide" data-pos={pos} aria-hidden={pos !== "active"} inert={pos !== "active" ? true : undefined}>
              <SlideComponent active={pos === "active"} step={pos === "active" ? deck.step : 0} />
            </div>
          );
        })}

        <div className="deck-logo">
          <Image src="/digirobotics/brand/digirobotics-logo.png" alt="DigiRobotics" fill sizes="160px" className="object-contain object-right" priority />
        </div>
        {!deck.cleanMode && (
          <span className="deck-page-num">
            {String(deck.index + 1).padStart(2, "0")} / {String(deck.total).padStart(2, "0")}
          </span>
        )}

        <div className="deck-progress-wrap">
          <div className="deck-progress" style={{ width: `${((deck.index + 1) / deck.total) * 100}%` }} />
        </div>

        <button type="button" className="deck-arrow deck-arrow--prev" aria-label="Previous slide" onClick={deck.prev} disabled={deck.atStart}>
          &#8592;
        </button>
        <button type="button" className="deck-arrow deck-arrow--next" aria-label="Next slide" onClick={deck.next} disabled={deck.atEnd}>
          &#8594;
        </button>

        <DeckChrome deck={deck} />
      </div>
    </div>
  );
}
