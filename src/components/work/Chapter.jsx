import { useRef, useState } from "react";
import { m, useTransform } from "framer-motion";
import { Reveal } from "../fx.jsx";
import Flow from "../Flow.jsx";
import { STUDIES } from "../../data/caseStudies.js";
import { pad2 } from "../../data/format.js";
import { useProgress } from "../../motion/scroll.js";
import { useMedia, useReducedMotion } from "../../motion/prefs.js";
import { MQ } from "../../motion/tokens.js";

/*
  One case study, kept short for senior readers who skim: its name, a
  one-line summary, the problem and our solution side by side, and the
  system flow. Chapters alternate:
  - recto (CS·01, 03, 05, no class): a paper band, numeral aside on the
    left, the dark machine-room flow panel;
  - verso (CS·02, 04, 06): an espresso band, numeral aside mirrored to
    the right, a paper blueprint panel.
  Tones come from `i % 2`, so adding a study re-flows the pattern by
  itself.
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

export function Chapter({ s, i }) {
  const verso = i % 2 === 1;

  return (
    <section className={`chapter band pad${verso ? " dark verso" : ""}`} id={`cs-${s.num}`}
      data-island={`Case study ${s.num}`}>
      <div className="wrap">

        <div className="ch-grid">
          <div className="ch-aside" aria-hidden="true">
            <div className="ch-aside-in">
              {/* an engraved numeral: a gold keyline, then foil pours up into it */}
              <Reveal className="ch-num">
                <span className="ch-num-line">{s.num}</span>
                <span className="ch-num-ink">{s.num}</span>
              </Reveal>
              <span className="ch-of">of {pad2(STUDIES.length)}</span>
            </div>
          </div>

          <div className="ch-main">
            <Reveal as="h2" className="h1 ch-title"><span className="foil">{s.title}</span></Reveal>
            <Reveal as="p" className="lead ch-summary" delay={1}>{s.summary}</Reveal>

            <div className="ps-grid">
              <Reveal className="ps-part">
                <h3 className="story-k">The problem</h3>
                <p>{s.problem}</p>
              </Reveal>
              <Reveal className="ps-part" delay={1}>
                <h3 className="story-k">Our solution</h3>
                <p>{s.solution}</p>
              </Reveal>
            </div>
          </div>
        </div>

        <FlowStage s={s} verso={verso} />
      </div>
    </section>
  );
}
