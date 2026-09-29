import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { STUDIES } from "../../data/caseStudies.js";
import { pad2 } from "../../data/format.js";
import { useProgress } from "../../motion/scroll.js";

/* Orientation on the long Work scroll: the contents rail beside the
   column on wide screens (≥1580px), a slim chapter bar under the topbar
   at ≤1080px. Between the two, each chapter's sticky numeral and its
   progress track do the job. */

export const RAIL = [
  ...STUDIES.map((s) => ({ id: `cs-${s.num}`, num: s.num, t: s.title })),
  { id: "impact", num: "§", t: "Impact" },
  { id: "stack", num: "§", t: "Tech stack" },
];
/* Over the hero, the closing band and the footer, neither shows. */
export const onRail = (id) => RAIL.some((r) => r.id === id);

export function Rail({ active, show }) {
  const navRef = useRef(null);
  const [tone, setTone] = useState("paper");

  /* The rail takes the tone of whatever band is actually behind it: a
     hairline observer at the viewport's centre, where the rail sits. */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setTone(e.target.dataset.tone); }),
      { rootMargin: "-49.5% 0px -50% 0px" }
    );
    // sections only: the rail carries data-tone itself
    document.querySelectorAll("section[data-tone]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* The gold marker glides along the spine to the active entry. */
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const a = nav.querySelector("a.on");
      if (!a) return;
      nav.style.setProperty("--rail-y", `${a.offsetTop}px`);
      nav.style.setProperty("--rail-h", `${a.offsetHeight}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active]);

  /* Focus inside keeps it shown: going inert under a focused link would
     drop focus to <body> (e.g. Home or End pressed while in the rail). */
  const [focusIn, setFocusIn] = useState(false);
  const visible = show || focusIn;

  return (
    /* inert while invisible: no blind tab stops */
    <nav ref={navRef} className={`rail${visible ? " show" : ""}`} data-tone={tone}
      aria-labelledby="rail-label" inert={!visible}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => {
        if (e.relatedTarget === null && !document.hasFocus()) return; // window switch: focus comes back here
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false);
      }}>
      <span className="mlabel" id="rail-label">Contents</span>
      {RAIL.map((r) => (
        <Link key={r.id} to={`/work#${r.id}`} className={active === r.id ? "on" : ""}
          aria-current={active === r.id ? "location" : undefined}>
          <b aria-hidden={r.num === "§" || undefined}>{r.num}</b><span>{r.t}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ≤1080px: a mono row fixed flush under the topbar — the chapter you're
   in, and a foil ruler with a tick where each later section begins.
   Decorative (the section headings carry the same words), so hidden
   from assistive tech. The page sets the matching anchor clearance. */
export function ChapterBar({ active, show, bodyRef }) {
  const barRef = useRef(null);
  const [ticks, setTicks] = useState([]);
  const p = useProgress(bodyRef, ["start 72px", "end end"]);

  // the topbar condenses as it scrolls; follow its real height
  useLayoutEffect(() => {
    const bar = barRef.current;
    const top = document.querySelector(".topbar");
    if (!bar || !top) return;
    const place = () => bar.style.setProperty("--tb-h", `${top.offsetHeight}px`);
    place();
    const ro = new ResizeObserver(place);
    ro.observe(top);
    return () => ro.disconnect();
  }, []);

  // where each section starts, in the ruler's own 0–1 progress units
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const b = body.getBoundingClientRect();
      // the small viewport, as framer's progress uses: a phone toolbar
      // showing or hiding must not slide the ticks off the ruler
      const span = b.height - document.documentElement.clientHeight + 72;
      const next = RAIL.slice(1).map((r) => {
        const el = document.getElementById(r.id);
        return el && span > 0 ? Math.min(1, (el.getBoundingClientRect().top - b.top) / span) : 0;
      });
      setTicks((old) =>
        old.length === next.length && old.every((x, k) => Math.abs(x - next[k]) < 0.001) ? old : next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [bodyRef]);

  const r = RAIL.find((x) => x.id === active) || RAIL[0];
  return (
    <div ref={barRef} className={`ch-bar${show ? " show" : ""}`} aria-hidden="true">
      <div className="wrap ch-bar-in">
        <span className="ch-bar-n">
          {r.num === "§" ? "§" : <>CS·{r.num}<em> / {pad2(STUDIES.length)}</em></>}
        </span>
        <span className="ch-bar-t">{r.t}</span>
      </div>
      <div className="ch-ruler">
        {ticks.map((x, k) => <b key={k} style={{ "--x": x }} />)}
        <m.i style={{ scaleX: p }} />
      </div>
    </div>
  );
}
