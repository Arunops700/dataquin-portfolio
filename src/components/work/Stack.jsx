import { memo, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { Reveal } from "../fx.jsx";
import { STUDIES, getStudy } from "../../data/caseStudies.js";
import { EVOLUTION, CATS, TECH, csHash } from "../../data/site.js";
import { countWord } from "../../data/format.js";
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

/* Every tool is always rendered; a filter closes the others up (grid
   rows 1fr → 0fr) instead of remounting the list, and makes them inert
   so they leave the tab order and the accessibility tree. A live region
   says how many remain. */
function TechIndex() {
  const [cat, setCat] = useState("all");
  const barRef = useRef(null);

  // the ink bar slides to the active filter (rows may wrap, so x and y)
  useLayoutEffect(() => {
    const w = barRef.current;
    if (!w) return;
    const place = () => {
      const b = w.querySelector(".filter-btn.active");
      if (!b) return;
      w.style.setProperty("--ink-x", `${b.offsetLeft}px`);
      w.style.setProperty("--ink-y", `${b.offsetTop + b.offsetHeight - 1}px`);
      w.style.setProperty("--ink-s", String(b.offsetWidth / 100));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(w);
    w.querySelectorAll(".filter-btn").forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [cat]);

  const filters = [["all", "All", TECH.length], ...Object.entries(CATS).map(([k, label]) => [k, label, COUNTS[k]])];
  const count = cat === "all" ? TECH.length : COUNTS[cat];

  return (
    <>
      <div className="filters" ref={barRef} role="group" aria-label="Filter tools by category">
        {filters.map(([key, label, n]) => (
          <button key={key} type="button" className={`filter-btn${cat === key ? " active" : ""}`}
            aria-pressed={cat === key} onClick={() => setCat(key)}>
            {label}{" "}<span className="count">{n}</span>
          </button>
        ))}
      </div>

      <div className="ti-rows">
        {TECH.map((t) => {
          const out = cat !== "all" && t.cat !== cat;
          const inner = (
            <>
              <span className="ti-ico">
                <img src={`/icons/${t.ico}`} alt="" loading="lazy" />
              </span>
              <span className="ti-name">{t.name}</span>
              <span className="ti-role">{t.role}</span>
              <span className="ti-go">
                {t.proj
                  ? <>Case Study {getStudy(t.proj).num} <span className="arr" aria-hidden="true">→</span></>
                  : <span className="ti-go-plain">In our stack</span>}
              </span>
            </>
          );
          return (
            <div className={`ti-item${out ? " is-out" : ""}`} key={t.name} inert={out}>
              <div className="ti-clip">
                {t.proj
                  ? <Link className="ti-row" to={`/work${csHash(t.proj)}`}>{inner}</Link>
                  : <div className="ti-row ti-row-static">{inner}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {count} tools{cat === "all" ? "" : ` in ${CATS[cat]}`}
      </p>
    </>
  );
}

export const Stack = memo(function Stack() {
  return (
    <section className="band deep pad" id="stack" data-rail data-tone="paper">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Who we are</span>
          <span className="ser">§ 03</span>
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

        <Reveal className="shead follow">
          <span className="mlabel">Tech stack</span>
          <span className="ser">§ 04 · {countWord(TECH.length)} tools</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">The tools <em className="foil">we build with.</em></h2>
          <p className="lead">
            The stack behind the {countWord(STUDIES.length)} chapters. Where a tool carried one
            of them, the row links straight to that case study.
          </p>
        </Reveal>
        <TechIndex />
      </div>
    </section>
  );
});
