import type { ComponentType, ReactNode } from "react";
import {
  slide01,
  slide02,
  slide03,
  slide04,
  slide05,
  slide06,
  slide07,
  slide08,
  slide09,
  slide10,
  slide11,
  slide12,
} from "./deck-copy";
import { CountUp, Headline, ImageFrame, Kicker, OrbitalMotif, PartnerLockup, Reveal, RevealStep, RichText, StepNum } from "./primitives";

export type SlideProps = { active: boolean; step: number };

const LEFT_RATIO: Record<"7-5" | "8-4", "5-7" | "4-8"> = { "7-5": "5-7", "8-4": "4-8" };

function TwoCol({ imageSide = "right", ratio = "7-5", copy, media }: { imageSide?: "left" | "right"; ratio?: "7-5" | "8-4"; copy: ReactNode; media: ReactNode }) {
  const cols = imageSide === "left" ? LEFT_RATIO[ratio] : ratio;
  return (
    <div className={`deck-slide-body deck-slide-body--${cols}`}>
      <div className="deck-col-copy">{copy}</div>
      <div className="deck-col-media">{media}</div>
    </div>
  );
}

function Slide01() {
  return (
    <>
      <OrbitalMotif motif={slide01.motif} />
      <Kicker lines={slide01.kicker} />
      <TwoCol
        copy={
          <>
            <Headline parts={slide01.headline} size="lg" d={1} />
            <Reveal d={2} as="p" className="deck-body">
              {slide01.body}
            </Reveal>
            <Reveal d={3} className="deck-lockups">
              {slide01.partners.map((p) => (
                <PartnerLockup key={p.src} {...p} />
              ))}
            </Reveal>
            <Reveal d={4} as="p" className="deck-mono">
              {slide01.footnote}
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide01.image} priority />}
      />
    </>
  );
}

function Slide02() {
  return (
    <>
      <OrbitalMotif motif={slide02.motif} />
      <Kicker lines={slide02.kicker} />
      <TwoCol
        imageSide="left"
        copy={
          <>
            <Headline parts={slide02.headline} d={1} />
            <Reveal d={2} as="p" className="deck-body">
              {slide02.body}
            </Reveal>
            <Reveal d={3} className="deck-stat">
              <p className="deck-stat-value">{slide02.stat.value}</p>
              <p className="deck-stat-cap">{slide02.stat.caption}</p>
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide02.image} />}
      />
    </>
  );
}

function Slide03({ step }: SlideProps) {
  return (
    <>
      <OrbitalMotif motif={slide03.motif} />
      <Kicker lines={slide03.kicker} />
      <TwoCol
        copy={
          <>
            <Headline parts={slide03.headline} d={1} />
            <div className="deck-steps">
              {slide03.steps.map((s, i) => (
                <RevealStep key={s.label} inView={step >= i} className="deck-step">
                  <StepNum>{s.label}</StepNum>
                  <p>
                    <strong>{s.strong}</strong> {s.body}
                  </p>
                </RevealStep>
              ))}
            </div>
          </>
        }
        media={<ImageFrame media={slide03.image} />}
      />
    </>
  );
}

function Slide04() {
  return (
    <>
      <OrbitalMotif motif={slide04.motif} />
      <Kicker lines={slide04.kicker} />
      <TwoCol
        imageSide="left"
        copy={
          <>
            <Headline parts={slide04.headline} d={1} />
            <Reveal d={2} as="p" className="deck-mono">
              {slide04.eyebrow}
            </Reveal>
            {slide04.quotes.map((q, i) => (
              <Reveal key={q.attribution} d={2 + i} className="deck-quote">
                <p>&ldquo;{q.quote}&rdquo;</p>
                <p className="deck-quote-attr">{q.attribution}</p>
              </Reveal>
            ))}
            <Reveal d={4}>
              <RichText parts={slide04.closingParts} className="deck-closing" />
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide04.image} />}
      />
    </>
  );
}

function Slide05({ active }: SlideProps) {
  return (
    <>
      <OrbitalMotif motif={slide05.motif} />
      <Kicker lines={slide05.kicker} />
      <div className="deck-slide-body deck-slide-body--wide">
        <Headline parts={slide05.headline} d={1} />
        <Reveal d={2}>
          <div className="deck-stat-cards">
            {slide05.stats.map((s) => (
              <div key={s.tag} className="deck-stat-card">
                <p className="deck-stat-card-tag">{s.tag}</p>
                <p className="deck-stat-card-value">
                  <CountUp active={active} to={s.countTo} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="deck-stat-card-caption">{s.caption}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal d={3} style={{ textAlign: "center", margin: "0 auto" }}>
          <RichText parts={slide05.closingParts} className="deck-closing deck-closing--lg" />
        </Reveal>
      </div>
    </>
  );
}

function Slide06() {
  return (
    <>
      <OrbitalMotif motif={slide06.motif} />
      <Kicker lines={slide06.kicker} />
      <TwoCol
        ratio="8-4"
        copy={
          <>
            <Headline parts={slide06.headline} d={1} />
            <div className="deck-adv-rows">
              {slide06.rows.map((r, i) => (
                <Reveal key={r.lead} d={2 + i} className="deck-adv-row" as="p">
                  <span className="deck-lead">{r.lead}</span> {r.body}
                </Reveal>
              ))}
            </div>
            <Reveal d={6} as="p" className="deck-mono deck-mono--lg" style={{ marginTop: "auto" }}>
              <span className="deck-lime">{slide06.closingLead}</span> {slide06.closing}
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide06.image} heightPx={520} />}
      />
    </>
  );
}

function Slide07() {
  return (
    <>
      <OrbitalMotif motif={slide07.motif} />
      <Kicker lines={slide07.kicker} />
      <TwoCol
        copy={
          <>
            <Headline parts={slide07.headline} d={1} />
            <Reveal d={2}>
              {slide07.rows.map((r) => (
                <div key={r.text} className="deck-cmp-row" data-tone={r.tone}>
                  <span className="deck-cmp-mark">{r.mark}</span>
                  <p>
                    {r.lead ? (
                      <span className="deck-lime" style={{ fontWeight: 600 }}>
                        {r.lead}{" "}
                      </span>
                    ) : null}
                    {r.text}
                  </p>
                </div>
              ))}
            </Reveal>
            <Reveal d={3} as="p" className="deck-body" style={{ fontWeight: 600, color: "var(--deck-ink)", fontSize: 34 }}>
              {slide07.tagline}
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide07.image} />}
      />
    </>
  );
}

function Slide08({ step }: SlideProps) {
  return (
    <>
      <OrbitalMotif motif={slide08.motif} />
      <Kicker lines={slide08.kicker} />
      <TwoCol
        imageSide="left"
        ratio="8-4"
        copy={
          <>
            <Headline parts={slide08.headline} d={1} inline />
            <Reveal d={2} as="p" className="deck-body">
              {slide08.body}
            </Reveal>
            <div className="deck-ledger">
              {slide08.ledger.map((row, i) => (
                <RevealStep key={row.label} inView={step >= i} className="deck-ledger-row">
                  <span className="deck-ledger-label">{row.label}</span>
                  <span className="deck-ledger-items">{row.items}</span>
                </RevealStep>
              ))}
            </div>
            <Reveal d={6} className="deck-cta-row" style={{ alignItems: "center" }}>
              <span className="deck-cta deck-cta--static">{slide08.ctaLabel}</span>
              <p className="deck-body" style={{ maxWidth: "40ch", fontSize: 26 }}>
                {slide08.ctaNote}
              </p>
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide08.image} heightPx={560} />}
      />
    </>
  );
}

function Slide09() {
  return (
    <>
      <OrbitalMotif motif={slide09.motif} />
      <Kicker lines={slide09.kicker} />
      <TwoCol
        copy={
          <>
            <Headline parts={slide09.headline} d={1} inline />
            <div className="deck-steps">
              {slide09.steps.map((s, i) => (
                <Reveal key={s.label} d={2 + i} className="deck-step">
                  <StepNum>{s.label}</StepNum>
                  <p>
                    <strong>{s.strong}</strong> — {s.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </>
        }
        media={<ImageFrame media={slide09.image} />}
      />
    </>
  );
}

function Slide10() {
  return (
    <>
      <OrbitalMotif motif={slide10.motif} />
      <Kicker lines={slide10.kicker} />
      <TwoCol
        copy={
          <>
            <Headline parts={slide10.headline} d={1} inline />
            <Reveal d={2}>
              {slide10.rows.map((r) => (
                <div key={r.handle} className="deck-team-row">
                  <p>
                    {r.name}{" "}
                    {r.note ? (
                      <span className="deck-mono" style={{ display: "inline", fontSize: 18 }}>
                        {r.note}
                      </span>
                    ) : null}
                  </p>
                  <span className={`deck-team-handle ${r.lime ? "deck-team-handle--lime" : ""}`}>{r.handle}</span>
                </div>
              ))}
            </Reveal>
            <Reveal d={3} as="p" className="deck-mono">
              {slide10.hostedAt} <span className="deck-lime">{slide10.hostedLink}</span>
            </Reveal>
            <Reveal d={4}>
              <RichText parts={slide10.taglineParts} className="deck-body" />
            </Reveal>
          </>
        }
        media={<ImageFrame media={slide10.image} />}
      />
    </>
  );
}

function Slide11({ step }: SlideProps) {
  return (
    <>
      <OrbitalMotif motif={slide11.motif} />
      <Kicker lines={slide11.kicker} />
      <div className="deck-slide-body deck-slide-body--wide">
        <Headline parts={slide11.headline} d={1} inline />
        <RevealStep inView={step >= 0}>
          {slide11.built.map((text) => (
            <div key={text} className="deck-check-row" data-done="true">
              <span className="deck-check-mark">&#10003;</span>
              <p>{text}</p>
            </div>
          ))}
        </RevealStep>
        <RevealStep inView={step >= 1}>
          {slide11.next.map((text) => (
            <div key={text} className="deck-check-row" data-done="false">
              <span className="deck-check-mark">&#8594;</span>
              <p>{text}</p>
            </div>
          ))}
        </RevealStep>
        <Reveal d={2} as="p" className="deck-mono" style={{ marginTop: "auto" }}>
          {slide11.footnote}
        </Reveal>
      </div>
    </>
  );
}

function Slide12() {
  return (
    <>
      <OrbitalMotif motif={slide12.motif} />
      <Kicker lines={slide12.kicker} />
      <div className="deck-slide-body deck-slide-body--wide" style={{ padding: "150px 80px 56px" }}>
        <Reveal d={1} as="p" className="deck-body" style={{ fontFamily: "Ubuntu, sans-serif", fontSize: 36, color: "#fff", maxWidth: "70ch" }}>
          {slide12.subheadline}
        </Reveal>
        <Reveal d={2} className="deck-ledger">
          {slide12.ledger.map((row) => (
            <div key={row.label} className="deck-ledger-row">
              <span className="deck-ledger-label">{row.label}</span>
              <span className="deck-ledger-items">
                {row.items.map((it, i) => (
                  <span key={i} className={it.lime ? "deck-lime" : undefined}>
                    {it.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </Reveal>
        <div style={{ alignSelf: "center", width: "min(56%, 860px)" }}>
          <ImageFrame media={slide12.image} heightPx={320} d={3} />
        </div>
        <Reveal d={4} className="deck-cta-row">
          {/* All three open in a new tab, same as the static deck's `<base target="_blank">` —
              a presenter clicking through live should never navigate the deck tab away. */}
          {slide12.ctas.map((cta) => (
            <a key={cta.label} href={cta.href} className="deck-cta deck-cta--lg" target="_blank" rel="noopener noreferrer">
              {cta.label}
            </a>
          ))}
        </Reveal>
      </div>
    </>
  );
}

export const SLIDE_COMPONENTS: ComponentType<SlideProps>[] = [Slide01, Slide02, Slide03, Slide04, Slide05, Slide06, Slide07, Slide08, Slide09, Slide10, Slide11, Slide12];
