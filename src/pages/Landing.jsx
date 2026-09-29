import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { m, useInView, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { useProgress, stepRoll } from "../motion/scroll.js";
import { Reveal, Magnetic, Email } from "../components/fx.jsx";
import ContactForm from "../components/ContactForm.jsx";
import FoilSheen from "../components/landing/FoilSheen.jsx";
import { Field } from "../three/Field.jsx";
import {
  CREDS, STORY_BEATS, PILLARS, DELIVERY, VALUES, TECH, CATS, CONTACT,
} from "../data/site.js";
import { STUDIES } from "../data/caseStudies.js";
import { cap, countWord, pad2 } from "../data/format.js";
import { useMedia, useReducedMotion } from "../motion/prefs.js";
import { MQ } from "../motion/tokens.js";
import { PAGE_META, usePageMeta } from "../seo.js";

/* ============================================================
   HERO STORY — a sticky stage the reader scrolls through. The 3D
   field owns the right of the stage and plays the same story progress
   as the copy, while the headline hands over to three beats — problem,
   build, result — each rising through its own line masks. A ledger
   index at the foot keeps the reader's place.
   ============================================================ */

/* A faded layer stays in the accessibility tree — the h1 and the beat
   headings are always readable — and only its links and buttons leave
   the tab order while it is hidden. Written to the DOM directly, so
   scrolling never re-renders React. */
function useHiddenLayer(opacity) {
  const ref = useRef(null);
  const apply = (v) => {
    const el = ref.current;
    if (!el) return;
    const hidden = String(v < 0.5);
    if (el.dataset.hidden === hidden) return;
    el.dataset.hidden = hidden;
    el.querySelectorAll("a, button").forEach((a) => {
      if (hidden === "true") a.setAttribute("tabindex", "-1");
      else a.removeAttribute("tabindex");
    });
  };
  useMotionValueEvent(opacity, "change", apply);
  useEffect(() => apply(opacity.get()), [opacity]);
  return ref;
}

/* Short viewports: the stage's copy is taller than the screen, and a
   sticky element only shows its tail when its section ends — long after
   the copy has faded. So the stage first scrolls its overflow into view,
   then sticks with its foot on the viewport's foot (a negative sticky
   top, --stage-over), and the story starts after that lead-in. `lead`
   is the share of the section's progress the lead-in takes; the section
   grows by the same amount, so the story itself keeps its length. */
function useStageLead(sectionRef, stageRef) {
  const lead = useMotionValue(0);
  useLayoutEffect(() => {
    const sec = sectionRef.current;
    const st = stageRef.current;
    if (!sec || !st) return;
    const set = () => {
      // every read first, then the one write. The small viewport, not
      // innerHeight: a phone's toolbar showing or hiding changes
      // innerHeight and would jump the pinned hero by its height (framer
      // measures scroll progress against clientHeight too).
      const vh = document.documentElement.clientHeight;
      const stageH = st.offsetHeight;
      const base = sec.offsetHeight - (parseFloat(sec.style.getPropertyValue("--stage-over")) || 0);
      const over = Math.max(0, stageH - vh);
      const travel = base + over - vh;
      const v = `${over}px`;
      if (sec.style.getPropertyValue("--stage-over") !== v) sec.style.setProperty("--stage-over", v);
      lead.set(travel > 0 ? over / travel : 0);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(st);
    ro.observe(sec);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
    };
  }, [sectionRef, stageRef, lead]);
  return lead;
}

/* One title row of a beat: rises through its mask on the way in and
   leaves through the top on the way out. `d` staggers row 2 behind row 1. */
function useRowY(p, a, b, d, w, enterOnly) {
  const s = a + d;
  return useTransform(
    p,
    enterOnly ? [s, s + w] : [s, s + w, b - 0.06 + d / 2, b - 0.02 + d / 2],
    enterOnly ? ["105%", "0%"] : ["105%", "0%", "0%", "-105%"]
  );
}

function Beat({ beat, p, last, still }) {
  const [a, b] = beat.range;
  // the reveal window: a crisp cut over ~28px of scroll under reduced motion
  const w = still ? 0.012 : 0.05;
  // rows and sub only enter when held; `vis` alone does the exit. The
  // last beat holds to the end so the stage never unpins on an empty screen.
  const hold = last || still;
  const vis = useTransform(p, last ? [a, a + 0.02] : [a, a + 0.02, b - 0.02, b], last ? [0, 1] : [0, 1, 1, 0]);
  const pe = useTransform(vis, (v) => (v > 0.5 ? "auto" : "none"));
  const ref = useHiddenLayer(vis);
  const rule = useTransform(p, [a, a + w], [0, 1]);
  const y1 = useRowY(p, a, b, 0, w, hold);
  const y2 = useRowY(p, a, b, 0.018, w, hold);
  const sIn = [a + 0.03, a + 0.03 + w];
  const subO = useTransform(p, hold ? sIn : [...sIn, b - 0.06, b - 0.03], hold ? [0, 1] : [0, 1, 1, 0]);
  const subY = useTransform(p, sIn, [still ? 0 : 16, 0]);
  const ctaO = useTransform(p, [a + 0.06, a + 0.06 + w], [0, 1]);

  return (
    <div className="beat">
      <m.div className="beat-in" ref={ref} style={{ opacity: vis, pointerEvents: pe }}>
        <div className="wrap">
          <div className="beat-k">
            <m.span className="beat-rule" style={{ scaleX: rule }} aria-hidden="true" />
            <span className="mlabel">{beat.k}</span>
          </div>
          <h2 className="beat-t">
            <span className="beat-row"><m.span style={{ y: y1 }}>{beat.t}</m.span></span>{" "}
            <span className="beat-row"><m.span style={{ y: y2 }}><em className="foil">{beat.em}</em></m.span></span>
          </h2>
          <m.p className="beat-s" style={{ opacity: subO, y: subY }}>{beat.s}</m.p>
          {beat.cta && (
            <m.div className="beat-cta" style={{ opacity: ctaO }}>
              <Magnetic>
                <Link to="/work" className="btn btn-gold btn-shine">See the work</Link>
              </Magnetic>
            </m.div>
          )}
        </div>
      </m.div>
    </div>
  );
}

function SiBar({ p, range: [a, b] }) {
  const fill = useTransform(p, [a, b], [0, 1]);
  return (
    <span className="si-bar">
      <m.span className="si-fill" style={{ scaleX: fill }} />
    </span>
  );
}

/* "01 / 03" odometer over one ledger tick per beat. Numbers only and
   aria-hidden: the beats themselves are real headings. It appears once
   the headline and credentials have gone (.22). */
function StoryIndex({ p, still }) {
  const n = STORY_BEATS.length;
  const show = useTransform(p, [0.21, 0.24], [0, 1]);
  const edges = STORY_BEATS.slice(0, -1).map((b, i) => (b.range[1] + STORY_BEATS[i + 1].range[0]) / 2);
  const [inp, out] = stepRoll(edges, still ? 0.004 : 0.012, 0, 1);
  const roll = useTransform(p, inp, out);
  return (
    <m.div className="story-index" style={{ opacity: show }} aria-hidden="true">
      <div className="wrap si-in">
        <span className="roll si-now">
          <m.span className="roll-list" style={{ y: roll }}>
            {STORY_BEATS.map((b, i) => (
              <span key={b.k}><b>{pad2(i + 1)}</b> / {pad2(n)}</span>
            ))}
          </m.span>
        </span>
        <span className="si-bars" style={{ "--n": n }}>
          {STORY_BEATS.map((b) => <SiBar key={b.k} p={p} range={b.range} />)}
        </span>
      </div>
    </m.div>
  );
}

function HeroStory() {
  const ref = useRef(null);
  const stageRef = useRef(null);
  const inView = useInView(ref, { margin: "120px 0px 120px 0px" });
  const still = useReducedMotion();
  const p = useProgress(ref);
  const lead = useStageLead(ref, stageRef);
  // Story progress, 0 → 1 across the story itself (after any lead-in),
  // in the units of STORY_BEATS[i].range. The 3D field, the headline,
  // the beats, the index and the sheen all read this one value.
  const sp = useTransform([p, lead], ([v, l]) => (l >= 1 ? 0 : Math.min(1, Math.max(0, (v - l) / (1 - l)))));

  // the headline hands over to the first beat with a short cross-fade
  const headO = useTransform(sp, [0, 0.1, 0.22], [1, 1, 0]);
  const headY = useTransform(sp, [0, 0.22], [0, -56]);
  const headPE = useTransform(headO, (v) => (v > 0.5 ? "auto" : "none"));
  const copyRef = useHiddenLayer(headO);
  const cueO = useTransform(sp, [0, 0.07], [1, 0]);
  // lift the foot scrim while the beats play (three.css reads --foot)
  const foot = useTransform(sp, [0.12, 0.22], [1, 0.45]);

  return (
    <section className="hero-story band dark" ref={ref} data-live={inView || undefined}>
      <div className="stage" ref={stageRef}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-aura" aria-hidden="true" />
        <Field progress={sp} place="hero" active={inView} />
        <m.div className="stage-scrim" style={{ "--foot": foot }} aria-hidden="true" />

        <m.div className="wrap stage-copy" ref={copyRef} style={{ opacity: headO, y: headY, pointerEvents: headPE }}>
          <div className="hero-meta fade-in">
            <span><b>Who we are</b> — DataQuin, your partner in success</span>
          </div>
          <h1 className="h-xl hero-title">
            <span className="row">
              <span>We are <FoilSheen progress={sp} range={[0, 0.12]} intro>DataQuin.</FoilSheen></span>
            </span>
          </h1>
          <p className="lead hero-lead fade-in">
            25+ years of data management and analytics for pharmaceutical, healthcare,
            finance and professional services teams — now with automation and AI. This brief
            shows what we offer, what we&rsquo;ve built and the technology behind it.
          </p>
          <div className="hero-actions fade-in">
            <Magnetic><Link to="/work" className="btn btn-gold btn-shine">See the work</Link></Magnetic>
            {/* a router link, not a native anchor: the native jump would
                fight the smooth scroller and snap back to the hero */}
            <Magnetic><Link to="/#contact" className="btn btn-line">Start a conversation <span className="arr" aria-hidden="true">→</span></Link></Magnetic>
          </div>
          <div className="hero-creds fade-in">
            {CREDS.map((c, i) => (
              <div className="cred" key={c.k} style={{ "--i": i }}>
                <span className="cred-v">{c.v}</span>
                <span className="cred-k">{c.k}</span>
              </div>
            ))}
          </div>
        </m.div>

        {STORY_BEATS.map((b, i) => (
          <Beat key={b.k} beat={b} p={sp} last={i === STORY_BEATS.length - 1} still={still} />
        ))}

        <StoryIndex p={sp} still={still} />

        <m.div className="scroll-cue" style={{ opacity: cueO }} aria-hidden="true">
          Scroll
        </m.div>
      </div>
    </section>
  );
}

/* ============================================================
   SERVICES — the pillars on a track that travels sideways as the
   reader scrolls down. Focus sweeps across them: the current pillar
   carries a foil rule, each numeral inks once reached and stays inked,
   and a counter rolls between whole steps. At 860px and below it is a
   native swipe track with snap points, a counter and arrows — the
   strip scrolls inside itself, never the page.
   ============================================================ */
const N = PILLARS.length;
/* desktop: strip progress → focus position 0 … N-1, over the window the track travels in */
const pillarAt = (v) => Math.min(1, Math.max(0, (v - 0.06) / 0.88)) * (N - 1);

/* Mobile: which pillar is in focus, read from the native scroller. Exact
   at every snap point: snap i rests at i × step, up to the last snap the
   scroller can reach before its end (k); the snaps past it are all
   clamped to max scroll, so the stretch from k to max maps onto the rest,
   and the end of the track always reads as the last pillar. Usually
   k = N − 2; where two whole pillars fit (≈ 822–860px wide) it is N − 3.
   Geometry is measured on resize, not per frame. */
function useScrollerPos(ref, pos, on) {
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let raf = 0;
    let step = 1;
    let max = 0;
    let k = 0;
    const measure = () => {
      const track = el.firstElementChild;
      const first = el.querySelector(".pillar");
      const gap = track ? parseFloat(getComputedStyle(track).columnGap) || 0 : 0;
      // layout width, not the rounded offsetWidth: snaps sit at i × step
      step = Math.max(1, first ? first.getBoundingClientRect().width + gap : el.clientWidth);
      max = el.scrollWidth - el.clientWidth;
      // the last snap more than a pixel short of max scroll
      k = Math.max(0, Math.min(N - 2, Math.ceil((max - 1) / step) - 1));
    };
    const read = () => {
      raf = 0;
      if (max <= 0) { pos.set(0); return; }
      const x = Math.min(max, Math.max(0, el.scrollLeft));
      const knee = k * step;
      pos.set(x <= knee ? x / step : k + ((N - 1 - k) * (x - knee)) / (max - knee));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    measure();
    read();
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, pos, on]);
}

function Pillar({ pl, i, pos }) {
  const act = useTransform(pos, (v) => Math.max(0, 1 - Math.abs(v - i)));   // current → foil rule
  const got = useTransform(pos, (v) => Math.min(1, Math.max(0, v - i + 1))); // reached → numeral inked, stays inked
  const n = pad2(i + 1);
  // a stable delay class: the stagger is zeroed in CSS while the track
  // travels (the travel paces the pillars there)
  return (
    <Reveal as={m.div} className="pillar" delay={Math.min(i, 4)} style={{ "--act": act, "--got": got }}>
      <span className="pillar-num num-ink" data-n={n} aria-hidden="true">{n}</span>
      <h3 className="pillar-t">{pl.t}</h3>
      <p className="pillar-s">{pl.s}</p>
    </Reveal>
  );
}

function ServicesStrip() {
  const ref = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const scrollerRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const wide = useMedia(MQ.aboveTablet);
  const still = useReducedMotion();
  const [shift, setShift] = useState(0);

  useEffect(() => {
    // travel exactly far enough that the last pillar ends on the right
    // gutter, mirroring the left one
    const measure = () => {
      const t = trackRef.current;
      const s = stageRef.current;
      if (!t || !s) return;
      const gutter = Math.max(44, (s.clientWidth - 1200) / 2);
      setShift(Math.max(0, t.scrollWidth - s.clientWidth + gutter));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [wide]);

  const p = useProgress(ref);
  const x = useTransform(p, [0.06, 0.94], [0, -shift]);

  // One focus driver for both layouts: the page scroll on desktop, the
  // strip's own scroller on mobile.
  const pos = useMotionValue(0);
  useMotionValueEvent(p, "change", (v) => { if (wide) pos.set(pillarAt(v)); });
  useScrollerPos(scrollerRef, pos, !wide);

  // arrows: aria-disabled written to the DOM (no re-render), never
  // `disabled`, so a focused arrow keeps its focus at the end of the track
  const syncArrows = (v) => {
    prevRef.current?.setAttribute("aria-disabled", String(v < 0.05));
    nextRef.current?.setAttribute("aria-disabled", String(v > N - 1.05));
  };
  useMotionValueEvent(pos, "change", syncArrows);
  // on a layout switch: desktop re-seeds pos from the page; the mobile
  // arrows mount without a change event, so sync them once
  useLayoutEffect(() => {
    if (wide) pos.set(pillarAt(p.get()));
    else syncArrows(pos.get());
  }, [wide]);

  const [ri, ro] = stepRoll(Array.from({ length: N - 1 }, (_, i) => i + 0.5), 0.12, 0, N - 1);
  const roll = useTransform(pos, ri, ro);
  const fill = useTransform(pos, [0, N - 1], [0, 1]);

  const go = (dir) => {
    const el = scrollerRef.current;
    const btn = dir < 0 ? prevRef.current : nextRef.current;
    if (!el || btn?.getAttribute("aria-disabled") === "true") return;
    const first = el.querySelector(".pillar");
    const gap = trackRef.current ? parseFloat(getComputedStyle(trackRef.current).columnGap) || 0 : 0;
    el.scrollBy({
      left: dir * (first ? first.offsetWidth + gap : el.clientWidth * 0.8),
      behavior: still ? "auto" : "smooth",
    });
  };

  const word = countWord(N);
  return (
    <section className="strip-sec band deep" ref={ref} id="services" style={{ "--n": N }}>
      <div className="strip-stage" ref={stageRef}>
        <div className="wrap">
          <Reveal className="shead">
            <span className="mlabel">What we do</span>
            <span className="ser">§ 01 · {word} areas</span>
          </Reveal>
          <Reveal className="sec-intro flush">
            <h2 className="h1">{cap(word)} ways in. <em className="foil">One standard.</em></h2>
          </Reveal>
        </div>
        <div className="strip-clip">
          <div
            className="strip-scroller"
            id="strip-scroller"
            ref={scrollerRef}
            {...(!wide && { role: "region", "aria-label": "What we do", tabIndex: 0 })}
          >
            <m.div className="strip-track" ref={trackRef} style={wide ? { x } : undefined}>
              {PILLARS.map((pl, i) => <Pillar key={pl.t} pl={pl} i={i} pos={pos} />)}
            </m.div>
          </div>
        </div>
        <div className="wrap strip-meter">
          <span className="roll sm-count" aria-hidden="true">
            <m.span className="roll-list" style={{ y: roll }}>
              {PILLARS.map((pl, i) => (
                <span key={pl.t}><b>{pad2(i + 1)}</b> / {pad2(N)}</span>
              ))}
            </m.span>
          </span>
          <span className="sm-bar" aria-hidden="true">
            <m.span className="sm-fill" style={{ scaleX: fill }} />
          </span>
          {!wide && (
            <span className="sm-nav">
              <button type="button" ref={prevRef} className="sm-btn" aria-label="Previous area"
                aria-controls="strip-scroller" onClick={() => go(-1)}>
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" ref={nextRef} className="sm-btn" aria-label="Next area"
                aria-controls="strip-scroller" onClick={() => go(1)}>
                <span aria-hidden="true">→</span>
              </button>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PROCESS — the steps stack as the reader scrolls: each row sticks and
   the next slides over it. A gold spine fills down each row as it
   arrives, its numeral inks from ghost to foil, and a covered row files
   itself as an index tab — so the top of the stack reads as a ruled
   list of what has been covered.
   ============================================================ */
/* Each row is veiled by the row that actually covers it: the veil runs
   from the moment the next row's top nears this row's foot to the
   moment it reaches its own pin line. Rows stay opaque (the veil is a
   paper ::after); dimming the row itself would let the stack show. */
const PIN = 96;    // desktop pin line
const STEP = 28;   // stack step: tall enough to hold a readable tab
const PIN_M = 76;  // phones: clear of the top bar
const STEP_M = 24;

function StackRow({ s, i, n, rowRef, nextRef, wide, flat }) {
  const step = wide ? STEP : STEP_M;
  const pin = (wide ? PIN : PIN_M) + i * step;
  const cov = useProgress(nextRef, [`start ${pin + 150}px`, `start ${pin + step}px`]);
  // arrives on its pin line; unpinned (flat) rows arrive mid-screen
  const arr = useProgress(rowRef, ["start 88%", flat ? "start 45%" : `start ${pin}px`]);
  const dim = useTransform(cov, [0, 1], [0, 0.45]);
  const covered = i < n - 1 && !flat;
  const num = pad2(i + 1);
  return (
    <m.div
      ref={rowRef}
      className="step-row stack-row"
      style={{
        top: flat ? undefined : pin,
        zIndex: i + 1,
        "--dim": covered ? dim : 0,
        "--cov": covered ? cov : 0,
        "--arr": arr,
      }}
    >
      {covered && (
        <span className="stack-tab" aria-hidden="true">
          <span className="stack-tab-n">{num}</span>
          <span className="stack-tab-t">{s.t}</span>
        </span>
      )}
      <span className="step-num num-ink" data-n={num} aria-hidden="true">{num}</span>
      <h3 className="step-t">{s.t}</h3>
      <p className="step-s">{s.s}</p>
    </m.div>
  );
}

function Process() {
  const wide = useMedia(MQ.aboveTablet);
  // landscape phones: a pinned row would not fit under its pin line
  const flat = !useMedia(MQ.tall);
  const refs = useRef(DELIVERY.map(() => ({ current: null }))).current;
  const word = countWord(DELIVERY.length);
  return (
    <section className="band pad" id="process">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">How we work</span>
          <span className="ser">§ 02 · {word} steps</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">{cap(word)} steps. <em className="foil">No surprises.</em></h2>
          <p className="lead">
            Every engagement runs the same way: we understand the real problem before
            touching a tool, research the right solution, and build in short cycles —
            validated continuously, delivered fast, supported after.
          </p>
        </Reveal>
        <div className={`stack-rows${flat ? " flat" : ""}`} style={{ "--tab-h": `${wide ? STEP : STEP_M}px` }}>
          {DELIVERY.map((s, i) => (
            <StackRow
              key={s.k}
              s={s}
              i={i}
              n={DELIVERY.length}
              rowRef={refs[i]}
              nextRef={refs[Math.min(i + 1, DELIVERY.length - 1)]}
              wide={wide}
              flat={flat}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   WHY + CONTACT
   ============================================================ */
function Contact() {
  return (
    <section className="band deep pad" id="contact">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Why DataQuin</span>
          <span className="ser">§ 03</span>
        </Reveal>
        <div className="contact-grid">
          <Reveal>
            <h2 className="h1">
              Your challenges are unique. <em className="foil">Your solution should be too.</em>
            </h2>
            <p className="lead contact-lead">
              We combine business expertise, data, technology and AI to deliver solutions that
              are practical, scalable and aligned with your goals — and measure the result.
            </p>
            <ul className="values-line">
              {VALUES.map((v) => <li key={v}>{v}</li>)}
            </ul>
            <p className="close-line">
              Let&rsquo;s turn your business challenges into measurable opportunities.
            </p>
            <div className="reach">
              <a href={`mailto:${CONTACT.email}`}><span className="k">Mail</span><Email address={CONTACT.email} /></a>
              <a href={CONTACT.phoneHref}><span className="k">Tel</span>{CONTACT.phone}</a>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CLOSING — the way on to the Work page: what's there, and two ways in.
   ============================================================ */
function Closing() {
  const ref = useRef(null);
  const p = useProgress(ref, ["start 90%", "center 45%"]);
  const live = useInView(ref); // the glow drifts only while the band is in view
  return (
    <section className="band dark cta-band cta-next pad" ref={ref} data-live={live || undefined}>
      <span className="cta-glow" aria-hidden="true" />
      <div className="wrap">
        <Reveal className="cta-copy">
          <span className="mlabel">Next: the work</span>
          <h2 className="cta-h">
            See the stack. <FoilSheen progress={p}>See what it solved.</FoilSheen>
          </h2>
          <p className="cta-s">
            {cap(countWord(TECH.length))} tools across {countWord(Object.keys(CATS).length)} disciplines,
            and {countWord(STUDIES.length)} real problems solved with them — the modern way, not the
            traditional one.
          </p>
          <div className="cta-act">
            <Magnetic>
              <Link to="/work" className="btn btn-gold btn-shine">Explore the work</Link>
            </Magnetic>
            <Magnetic>
              <Link to="/work#stack" className="btn btn-line">
                Tech stack <span className="arr" aria-hidden="true">→</span>
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  // one source for the home head: seo.js derives it from the data, and
  // the build script checks index.html's static head against it
  usePageMeta(PAGE_META.home);

  return (
    <>
      <HeroStory />
      <ServicesStrip />
      <Process />
      <Contact />
      <Closing />
    </>
  );
}
