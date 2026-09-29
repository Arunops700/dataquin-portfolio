import { memo, useRef, useState } from "react";
import { m, useTransform } from "framer-motion";
import { Reveal } from "../fx.jsx";
import Flow from "../Flow.jsx";
import { LedgerFigure, figLen } from "./LedgerFigure.jsx";
import { STUDIES } from "../../data/caseStudies.js";
import { pad2 } from "../../data/format.js";
import { useProgress } from "../../motion/scroll.js";
import { useMedia, useReducedMotion } from "../../motion/prefs.js";
import { MQ } from "../../motion/tokens.js";

/*
  One case study as a ledger spread. Chapters alternate:
  - recto (CS·01, 03, 05, no class): a paper band, numeral aside on the left, the
    dark machine-room flow panel;
  - verso (CS·02, 04, 06): an espresso band, numeral aside and the
    metrics exhibit mirrored to the right, a paper blueprint panel.
  The story/tools split is never mirrored, so the visual order always
  follows the DOM: story first. Tones come from `i % 2`, so adding a
  study re-flows the pattern by itself.
*/

/* Flow panel scroll ranges. Across: the sheet settles over the first
   half, the lines draw from .35 and complete as the panel's centre
   reaches mid-screen. Down (the stage ledger): the spine's tip rides at
   70–80% of the viewport, just ahead of the reader's eye. */
const ACROSS = ["start end", "center 50%"];
const DOWN = ["start 80%", "end 70%"];
/* Exact zeros let framer write `transform: none`, so a settled (or never
   tilted) panel leaves the compositor and its small type renders crisp. */
const FLAT = { rotateX: 0, rotateY: 0, y: 0 };

function FlowStage({ s, verso }) {
  const ref = useRef(null);
  const still = useReducedMotion();
  const wide = useMedia(MQ.aboveTablet);
  const [vertical, setVertical] = useState(false); // reported by Flow's fit test
  // every hook runs unconditionally; the mode only chooses among results
  const p = useProgress(ref, vertical ? DOWN : ACROSS);
  const settle = useTransform(p, [0, 0.5], [0, 1]);
  const drawAcross = useTransform(p, [0.35, 1], [0, 1]);
  const rotateX = useTransform(settle, [0, 1], [12, 0]);
  const rotateY = useTransform(settle, [0, 1], [verso ? -4 : 4, 0]);
  const y = useTransform(settle, [0, 1], [48, 0]);
  // the sheet stands up off the desk only where the diagram runs across
  const tilt = wide && !vertical && !still;
  const stages = Math.max(...s.flow.nodes.map((n) => n.col)) + 1;

  return (
    <div ref={ref} className="flow-frame">
      <Reveal className="flow-lift">
        <m.div className={`flow-panel${verso ? " is-paper" : ""}`} style={tilt ? { rotateX, rotateY, y } : FLAT}>
          <div className="fp-head">
            <span className="mlabel">System flow · CS·{s.num}</span>
            <span className="fp-meta">{pad2(stages)} stages · {pad2(s.flow.nodes.length)} components</span>
          </div>
          <Flow nodes={s.flow.nodes} edges={s.flow.edges}
            progress={vertical ? p : drawAcross} onMode={setVertical} />
        </m.div>
      </Reveal>
    </div>
  );
}

/* memo: the page re-renders as the rail's active entry changes; a
   chapter's props (a STUDIES entry and its index) never do. */
export const Chapter = memo(function Chapter({ s, i }) {
  const gridRef = useRef(null);
  const verso = i % 2 === 1;
  const [lead, ...rest] = s.metrics; // metrics[0] is each study's headline
  // the aside's track fills while its numeral is pinned
  const track = useProgress(gridRef, ["start 128px", "end 60%"]);

  return (
    <section className={`chapter band pad${verso ? " dark verso" : ""}`} id={`cs-${s.num}`}
      data-rail data-tone={verso ? "dark" : "paper"}>
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Case Study {s.num} — {s.type}</span>
          <span className="ser">DQ / CS·{s.num}</span>
        </Reveal>

        <div className="ch-grid" ref={gridRef}>
          <div className="ch-aside" aria-hidden="true">
            <div className="ch-aside-in">
              {/* an engraved numeral: a gold keyline, then foil pours up into it */}
              <Reveal className="ch-num">
                <span className="ch-num-line">{s.num}</span>
                <span className="ch-num-ink">{s.num}</span>
              </Reveal>
              <span className="ch-of">of {pad2(STUDIES.length)}</span>
              <span className="ch-track"><m.span style={{ scaleY: track }} /></span>
            </div>
          </div>

          <div className="ch-main">
            <Reveal as="h2" className="h1 ch-title"><span className="foil">{s.title}</span></Reveal>
            <Reveal as="p" className="lead ch-tagline" delay={1}>{s.tagline}.</Reveal>

            <Reveal className="ch-exhibit">
              <div className="ch-lead" style={{ "--len": figLen(lead) }}>
                <div className="ch-lead-v"><LedgerFigure m={lead} /></div>
                <div className="ch-lead-k">{lead.k}</div>
              </div>
              <div className="met-list">
                {rest.map((x) => (
                  <div className="met-li" key={x.k}>
                    <span className="met-v"><LedgerFigure m={x} /></span>
                    <span className="met-k">{x.k}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <div className="story-grid">
              <Reveal as="article" className="story">
                {/* every intro is [the problem, the solution…] */}
                <div className="story-part">
                  <span className="story-k">The problem</span>
                  <p>{s.intro[0]}</p>
                </div>
                <div className="story-part">
                  <span className="story-k">Our solution</span>
                  {s.intro.slice(1).map((p, k) => <p key={k}>{p}</p>)}
                </div>
                <ul className="story-points">
                  {s.points.map(([strong, more]) => (
                    <li key={strong}><span><strong>{strong}</strong>{more}</span></li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={1} className="tools-ledger">
                <span className="mlabel">Tools used</span>
                {s.tools.map(([name, desc]) => (
                  <div className="tool-row" key={name}>
                    <span className="tool-name">{name}</span>
                    <span className="tool-desc">{desc}</span>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </div>

        <FlowStage s={s} verso={verso} />
      </div>
    </section>
  );
});
