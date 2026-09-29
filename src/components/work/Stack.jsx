import { memo, useLayoutEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { Reveal } from "../fx.jsx";
import { EVOLUTION, CATS, TECH } from "../../data/site.js";
import { cap, countWord, pad2 } from "../../data/format.js";
import { TechSphere } from "./TechSphere.jsx";
import { useProgress } from "../../motion/scroll.js";
import { useMedia } from "../../motion/prefs.js";
import { MQ } from "../../motion/tokens.js";

const COUNTS = Object.fromEntries(
  Object.keys(CATS).map((k) => [k, TECH.filter((t) => t.cat === k).length])
);

/* The four eras on one line that draws as the reader arrives: across on
   desktop, a vertical spine on phones and tablets. Each era's diamond
   fills as the line reaches it. Scroll-linked, so it holds still when
   the reader does (reduced motion included) and is complete once the
   block has settled into view. */
function Evolution() {
  const ref = useRef(null);
  const across = useMedia(MQ.aboveTablet);
  const p = useProgress(ref, across ? ["start 85%", "start 45%"] : ["start 80%", "end 75%"]);

  // each diamond's position along the line (0–1), measured, so it lights
  // exactly when the line arrives whatever the text lengths
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      el.querySelectorAll(".evo-step").forEach((s) => {
        const at = across ? (s.offsetLeft + 5) / w : (s.offsetTop + 10) / h;
        s.style.setProperty("--at", at.toFixed(4));
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [across]);

  return (
    <m.div className="evo" ref={ref} style={{ "--p": p, "--n": EVOLUTION.length }}>
      <span className="evo-line" aria-hidden="true"><i /></span>
      {EVOLUTION.map((e, i) => (
        <Reveal className={`evo-step${e.now ? " now" : ""}`} key={e.t} delay={Math.min(i, 4)}>
          <span className="era">{e.now && <span className="evo-dot" />}{e.era}</span>
          <div className="t">{e.t}</div>
          <div className="s">{e.s}</div>
        </Reveal>
      ))}
    </m.div>
  );
}

/* Focus from the keyboard, not from a tap or a click (an engine without
   :focus-visible just skips the highlight) */
const byKeyboard = (el) => {
  try { return el.matches(":focus-visible"); } catch { return false; }
};

/* The stack, shown two ways: the sphere of tool tiles (turn it, or point
   at a tool in the ledger to bring its tile to the front), and the
   ledger itself — every tool by discipline, with what we use it for.
   The ledger is the readable version; the sphere is decoration.
   A row points at its tile on hover (fine pointers), on a tap (which
   toggles it) and on keyboard focus; focus or a tap leaving the ledger
   lets go. */
function StackShowcase() {
  const [hot, setHot] = useState(-1);
  const fine = useMedia(MQ.fine);
  return (
    <div className="stk">
      <div className="stk-stage">
        <TechSphere hot={hot} />
        <p className="stk-hint" aria-hidden="true">Drag to turn</p>
      </div>
      <div className="stk-ledger" onMouseLeave={fine ? () => setHot(-1) : undefined}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHot(-1); }}>
        {Object.entries(CATS).map(([k, label], ci) => (
          <Reveal className="stk-cat" key={k} delay={Math.min(ci, 4)}>
            <div className="stk-cat-h">
              <h3 className="stk-cat-t">{label}</h3>
              <span className="stk-n" aria-hidden="true">{pad2(COUNTS[k])}</span>
            </div>
            <ul>
              {TECH.map((t, i) => (t.cat !== k ? null : (
                <li key={t.name} className={`stk-row${hot === i ? " hot" : ""}`} tabIndex={0}
                  onMouseEnter={fine ? () => setHot(i) : undefined}
                  // a mouse has already pointed on hover; a tap toggles
                  onClick={() => setHot((h) => (h === i && !fine ? -1 : i))}
                  // keyboard focus only: a tap's own focus is left to the click
                  onFocus={(e) => { if (byKeyboard(e.currentTarget)) setHot(i); }}>
                  <span className="stk-ico"><img src={`/icons/${t.ico}`} alt="" loading="lazy" /></span>
                  <span className="stk-name">{t.name}</span>
                  <span className="stk-role">{t.role}</span>
                </li>
              )))}
            </ul>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export const Stack = memo(function Stack() {
  return (
    <section className="band deep pad" id="stack" data-rail data-tone="paper">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Tech stack</span>
          <span className="ser">§ 01 · {countWord(TECH.length)} tools</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">The tools <em className="foil">we build with.</em></h2>
          <p className="lead">
            {cap(countWord(TECH.length))} tools across {countWord(Object.keys(CATS).length)} disciplines — the
            stack behind every solution we deliver, from reporting to AI engineering.
          </p>
        </Reveal>
        <StackShowcase />

        <Reveal className="shead follow">
          <span className="mlabel">How we've grown</span>
          <span className="ser">§ 02</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">Technology keeps evolving. <em className="foil">So do we.</em></h2>
          <p className="lead">
            Every time the data landscape shifts, we master the new layer and put it into
            production. From spreadsheet automation to dashboards, from integration to AI
            engineering — as the stack evolves, so does the way we deliver.
          </p>
        </Reveal>
        <Evolution />
      </div>
    </section>
  );
});
