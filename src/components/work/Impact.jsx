import { memo, useRef } from "react";
import { Link } from "react-router-dom";
import { m, useTransform } from "framer-motion";
import { Reveal } from "../fx.jsx";
import { LedgerFigure, figLen } from "./LedgerFigure.jsx";
import { getStudy } from "../../data/caseStudies.js";
import { IMPACTS, OLD_STEPS, NEW_STEPS, csHash } from "../../data/site.js";
import { JOURNEY_SCALE, JOURNEY_TOTALS } from "../../data/work.js";
import { countWord, pad2 } from "../../data/format.js";
import { useProgress } from "../../motion/scroll.js";
import { useReducedMotion } from "../../motion/prefs.js";

const WHO = [["old", "The traditional route"], ["now", "With DataQuin"]];

/* The two journeys' totals drawn to scale. The long ink bar crawls
   first, then the short foil bar lands, both done while the block is
   still in the lower half of the screen. Under reduced motion the bars
   stand at full length: they encode facts, so a half-drawn bar parked
   on screen would misreport them. Every value is printed as text too. */
function JourneyScale() {
  const ref = useRef(null);
  const still = useReducedMotion();
  const p = useProgress(ref, ["start 95%", "start 55%"]);
  const oldX = useTransform(p, [0, 0.6], [0, 1]);
  const nowX = useTransform(p, [0.6, 1], [0, 1]);
  return (
    <div className="jt" ref={ref}>
      {JOURNEY_SCALE.map((r) => (
        <div className="jt-block" key={r.id}>
          <div className="jt-head">
            <span className="mlabel">{r.k}</span>
            <span className="jt-unit">{r.unit}</span>
          </div>
          {WHO.map(([cls, who]) => {
            const d = r[cls];
            return (
              <div className={`jt-row ${cls}`} key={cls}>
                <span className="jt-who">{who}</span>
                <span className="jt-track" aria-hidden="true"
                  style={{ "--a": (d.from ?? d.to) / r.max, "--b": d.to / r.max }}>
                  <m.i className="jt-bar" style={{ scaleX: still ? 1 : cls === "old" ? oldX : nowX }} />
                </span>
                <span className="jt-v">{d.label}</span>
              </div>
            );
          })}
          <div className="jt-axis" aria-hidden="true">
            {r.ticks.map((t) => <span key={t} style={{ "--x": t / r.max }}>{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Journey({ cls, badge, steps, total, delay }) {
  return (
    <Reveal className={`j-col ${cls}`} delay={delay}>
      <span className="j-badge">{badge}</span>
      <div className="j-steps">
        {steps.map(([t, d, time], k) => (
          <div className="j-step" key={t}>
            <span className="n">{pad2(k + 1)}</span>
            <span className="j-body">
              <span className="t">{t}</span>
              <span className="d">{d}</span>
            </span>
            <span className="j-time">{time}</span>
          </div>
        ))}
      </div>
      <div className="j-total">
        <span className="k">Total</span>
        <span className="v">{total}</span>
      </div>
    </Reveal>
  );
}

/* Measured outcomes as a figure-first ruled grid (3×2 → 2×3 → 1×6, no
   orphans), then the same request told as two journeys. Each cell is an
   always-opaque link with its Reveal inside, so the hairline grid never
   shows through a cell that is still fading in. */
export const Impact = memo(function Impact() {
  return (
    <section className="band pad" id="impact" data-rail data-tone="paper">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Measured outcomes</span>
          <span className="ser">§ 01 · {countWord(IMPACTS.length)} entries</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">We don&rsquo;t sell effort. <em className="foil">We sell outcomes.</em></h2>
          <p className="lead">
            Every build is judged on hours returned, errors removed and decisions unblocked.
            Each number below traces back to a chapter above.
          </p>
        </Reveal>
        <div className="imp-grid">
          {IMPACTS.map((x, i) => (
            <Link key={x.cs + x.label} to={`/work${csHash(x.cs)}`} className="imp-cell">
              <Reveal as="span" className="imp-in" delay={i % 3}>
                <span className="imp-fig" style={{ "--len": figLen(x) }}><LedgerFigure m={x} /></span>
                <span className="imp-label">{x.label}</span>
                <span className="imp-sub">{x.sub}</span>
                <span className="imp-go">
                  Case Study {getStudy(x.cs).num} <span className="arr" aria-hidden="true">→</span>
                </span>
              </Reveal>
            </Link>
          ))}
        </div>

        <Reveal className="shead follow">
          <span className="mlabel">The difference in practice</span>
          <span className="ser">§ 02</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">The same request, <em className="foil">two journeys.</em></h2>
          <p className="lead">
            &ldquo;I need a regional sales dashboard with row-level security by Friday.&rdquo; Here is
            what actually happens next — with and without DataQuin.
          </p>
        </Reveal>
        <div className="journey">
          <Journey cls="old" badge={WHO[0][1]} steps={OLD_STEPS} total={JOURNEY_TOTALS.old} />
          <Journey cls="new" badge={WHO[1][1]} steps={NEW_STEPS} total={JOURNEY_TOTALS.now} delay={1} />
        </div>
        <JourneyScale />
      </div>
    </section>
  );
});
