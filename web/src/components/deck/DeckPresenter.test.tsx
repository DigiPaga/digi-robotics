import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DeckPresenter } from "./DeckPresenter";
import { REVEAL_STEPS, SLIDES, SPEAKER_NOTES } from "./deck-copy";

// jsdom keeps one `window` per test file, so the URL hash a previous test left behind
// (the presenter writes it on every navigation) would otherwise leak into the next test.
beforeEach(() => {
  window.location.hash = "";
});

// jsdom has no matchMedia; CountUp (slide 5) checks prefers-reduced-motion before animating.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("deck-copy", () => {
  it("has exactly 12 slides, one speaker note per slide", () => {
    expect(SLIDES).toHaveLength(12);
    expect(SPEAKER_NOTES).toHaveLength(12);
  });

  it("only gates reveal steps on slides that exist", () => {
    for (const index of Object.keys(REVEAL_STEPS).map(Number)) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(SLIDES.length);
    }
  });
});

describe("DeckPresenter", () => {
  it("renders all 12 slides and opens on slide 1", () => {
    render(<DeckPresenter />);
    expect(document.querySelectorAll(".deck-slide")).toHaveLength(12);
    expect(screen.getByText("01 / 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DigiRobotics" })).toBeInTheDocument();
  });

  it("advances slides with the right arrow key and keeps the hash in sync", () => {
    render(<DeckPresenter />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("02 / 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Problem" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#2");
  });

  it("goes back with the left arrow key", () => {
    render(<DeckPresenter />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("01 / 12")).toBeInTheDocument();
  });

  it("gates slide 3's steps behind the next key before advancing to slide 4", () => {
    render(<DeckPresenter />);
    fireEvent.keyDown(window, { key: "ArrowRight" }); // -> slide 2
    fireEvent.keyDown(window, { key: "ArrowRight" }); // -> slide 3, step 0
    expect(screen.getByText("03 / 12")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" }); // step 1
    fireEvent.keyDown(window, { key: "ArrowRight" }); // step 2
    expect(screen.getByText("03 / 12")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" }); // -> slide 4
    expect(screen.getByText("04 / 12")).toBeInTheDocument();
  });

  it("toggles clean mode with 'h', hiding the page counter", () => {
    render(<DeckPresenter />);
    expect(screen.getByText("01 / 12")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "h" });
    expect(screen.queryByText("01 / 12")).not.toBeInTheDocument();
  });

  it("toggles the notes panel with 'n'", () => {
    render(<DeckPresenter />);
    expect(screen.getByText(SPEAKER_NOTES[0]).closest(".deck-notes")).not.toHaveClass("is-open");
    fireEvent.keyDown(window, { key: "n" });
    expect(screen.getByText(SPEAKER_NOTES[0]).closest(".deck-notes")).toHaveClass("is-open");
  });

  it("jumps to a slide by number", () => {
    render(<DeckPresenter />);
    fireEvent.keyDown(window, { key: "5" });
    expect(screen.getByText("05 / 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Market Size" })).toBeInTheDocument();
  });

  it("jumps to slide 12 on a two-digit number", () => {
    render(<DeckPresenter />);
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByText("12 / 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Time Is Now" })).toBeInTheDocument();
  });
});
