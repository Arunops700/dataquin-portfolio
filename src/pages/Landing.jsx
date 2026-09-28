import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { m, useTransform, useInView, useMotionValueEvent } from "framer-motion";
import { useProgress } from "../motion/scroll.js";
import { Reveal, Magnetic } from "../components/fx.jsx";
import ContactForm from "../components/ContactForm.jsx";
import { Field } from "../three/Field.jsx";
import { CREDS, STORY_BEATS, PILLARS, DELIVERY, PROOF, TECH, csHash } from "../data/site.js";
import { STUDIES, getStudy } from "../data/caseStudies.js";
import { useMedia } from "../motion/prefs.js";
import { usePageMeta } from "../seo.js";

/* ============================================================
   HERO STORY — a sticky stage the reader scrolls through.
   The 3D field pours from scattered rows into one stream while the
   headline gives way to three beats: problem, build, result.
   ============================================================ */
/* Faded-out copy must also leave the tab order and the accessibility
   tree: `inert` follows the opacity, toggled on the DOM node directly so
   scrolling never re-renders React. */
function useInertWhenHidden(opacity) {
  const ref = useRef(null);
  useMotionValueEvent(opacity, "change", (v) => {
    const el = ref.current;
    if (el) el.inert = v < 0.5;
  });
  useEffect(() => { if (ref.current) ref.current.inert = opacity.get() < 0.5; }, [opacity]);
  return ref;
}

function Beat({ beat, p, last }) {
  const [a, b] = beat.range;
  // the last beat holds to the end so the stage never unpins on an empty screen
  const o = useTransform(p, last ? [a, a + 0.06, 1, 1] : [a, a + 0.06, b - 0.05, b], last ? [0, 1, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(p, last ? [a, a + 0.06, 1, 1] : [a, a + 0.06, b - 0.05, b], last ? [34, 0, 0, 0] : [34, 0, 0, -34]);
  const pe = useTransform(o, (v) => (v > 0.5 ? "auto" : "none"));
  const ref = useInertWhenHidden(o);
  return (
    <div className="beat">
    <m.div className="beat-in" ref={ref} style={{ opacity: o, y, pointerEvents: pe }}>
      <div className="wrap">
        <span className="mlabel">{beat.k}</span>
        <h2 className="beat-t">
          {beat.t} <em className="foil">{beat.em}</em>
        </h2>
        <p className="beat-s">{beat.s}</p>
        {beat.cta && (
          <Magnetic>
            <Link to="/work" className="btn btn-gold btn-shine">See the work</Link>
          </Magnetic>
        )}
      </div>
    </m.div>
    </div>
  );
}

function HeroStory() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "120px 0px 120px 0px" });
  const p = useProgress(ref);

  const field = useTransform(p, [0.12, 0.8], [0, 1]);
  // the headline hands over to the first beat with a short cross-fade
  const headO = useTransform(p, [0, 0.1, 0.22], [1, 1, 0]);
  const headY = useTransform(p, [0, 0.22], [0, -56]);
  const headPE = useTransform(headO, (v) => (v > 0.5 ? "auto" : "none"));
  const copyRef = useInertWhenHidden(headO);
  const cueO = useTransform(p, [0, 0.07], [1, 0]);

  return (
    <section className="story band dark" ref={ref}>
      <div className="stage">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-aura" aria-hidden="true" />
        <Field progress={field} active={inView} />
        <div className="stage-scrim" aria-hidden="true" />

        <m.div className="wrap stage-copy" ref={copyRef} style={{ opacity: headO, y: headY, pointerEvents: headPE }}>
          <div className="hero-meta fade-in">
            <span><b>DataQuin</b> — Your partner in success</span>
            <span>Data · Automation · AI Engineering</span>
          </div>
          <h1 className="h-xl hero-title" style={{ maxWidth: 980 }}>
            <span className="row"><span>We turn <em className="foil">manual days</em></span></span>
            <span className="row"><span>into <em className="foil shine">automated hours.</em></span></span>
          </h1>
          <p className="lead hero-lead fade-in" style={{ maxWidth: 640 }}>
            Dashboards, integrations and AI systems for firms that are tired of copy-paste
            work — every one of them live, measured and still running today.
          </p>
          <div className="hero-actions fade-in">
            <Magnetic><Link to="/work" className="btn btn-gold btn-shine">See the work</Link></Magnetic>
            {/* a router link, not a native anchor: the native jump would
                fight the smooth scroller and snap back to the hero */}
            <Magnetic><Link to="/#contact" className="btn btn-line">Start a conversation <span className="arr" aria-hidden="true">→</span></Link></Magnetic>
          </div>
          <div className="hero-creds fade-in">
            {CREDS.map((c) => (
              <div className="cred" key={c.k}>
                <span className="cred-v">{c.v}</span>
                <span className="cred-k">{c.k}</span>
              </div>
            ))}
          </div>
        </m.div>

        {STORY_BEATS.map((b, i) => <Beat key={b.k} beat={b} p={p} last={i === STORY_BEATS.length - 1} />)}

        <m.div className="scroll-cue" style={{ opacity: cueO }} aria-hidden="true">
          Scroll
        </m.div>
      </div>
    </section>
  );
}

/* ============================================================
   SERVICES — seven pillars on a track that travels sideways as the
   reader scrolls down. Below 900px it is a plain vertical list.
   ============================================================ */
function ServicesStrip() {
  const ref = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const wide = useMedia("(min-width: 900px)");
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

  return (
    <section className="strip-sec band" ref={ref} id="services">
      <div className="strip-stage" ref={stageRef}>
        <div className="wrap">
          <Reveal className="shead">
            <span className="mlabel">What we do</span>
            <span className="ser">§ 01 · seven areas</span>
          </Reveal>
          <Reveal className="sec-intro" style={{ marginBottom: 0 }}>
            <h2 className="h1">Seven ways in. <em className="foil">One standard.</em></h2>
          </Reveal>
        </div>
        <div className={wide ? "strip-clip" : undefined}>
        <m.div className="strip-track" ref={trackRef} style={wide ? { x } : undefined}>
          {PILLARS.map((pl, i) => (
            <Reveal className="pillar" key={pl.t} delay={wide ? 0 : Math.min(i, 4)}>
              <span className="pillar-num">0{i + 1}</span>
              <span className="pillar-t">{pl.t}</span>
              <span className="pillar-s">{pl.s}</span>
            </Reveal>
          ))}
        </m.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PROOF — three builds, each one a row into its chapter on /work.
   ============================================================ */
function Proof() {
  return (
    <section className="band deep pad" id="proof">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Proof, not promises</span>
          <span className="ser">§ 02 · six builds</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">Every claim on this page <em className="foil">has a build behind it.</em></h2>
        </Reveal>
        <div className="ledg proof">
          {PROOF.map((id, i) => {
            const s = getStudy(id);
            return (
              <Reveal key={id} as={Link} to={`/work${csHash(id)}`} className="ledg-row" delay={Math.min(i, 4)}>
                <span className="ledg-num">{s.card.metric}</span>
                <span className="ledg-main">
                  <span className="ledg-label">{s.title}</span>
                  <span className="ledg-sub" style={{ display: "block" }}>{s.card.line}</span>
                </span>
                <span className="ledg-go">
                  Case Study {s.num} <span className="arr" aria-hidden="true">→</span>
                </span>
              </Reveal>
            );
          })}
        </div>
        <Reveal style={{ marginTop: 36 }}>
          <Magnetic>
            <Link to="/work" className="btn btn-line">
              All {STUDIES.length} case studies <span className="arr" aria-hidden="true">→</span>
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   PROCESS — five steps that stack as the reader scrolls: each row
   sticks and the one beneath slides over it.
   ============================================================ */
/* Each row is veiled by the row that actually covers it: the veil runs
   from the moment the next row's top reaches this row's foot to the
   moment it reaches its own pin line. Rows stay opaque (the veil is a
   paper ::after); dimming the row itself would let the stack show. */
const PIN = 96;
const STEP = 18;
function StackRow({ s, i, n, rowRef, nextRef, wide }) {
  const pin = wide ? PIN + i * STEP : 76;
  const nextPin = wide ? PIN + (i + 1) * STEP : 76;
  const p = useProgress(nextRef, [`start ${pin + 150}px`, `start ${nextPin}px`]);
  const scale = useTransform(p, [0, 1], [1, 0.97]);
  const dim = useTransform(p, [0, 1], [0, 0.45]);
  const last = i === n - 1;
  return (
    <m.div
      ref={rowRef}
      className="step-row stack-row"
      style={{ top: pin, zIndex: i + 1, scale: last ? 1 : scale, "--dim": last ? 0 : dim, "--cov": last ? 0 : p }}
    >
      <span className="step-num" aria-hidden="true">0{i + 1}</span>
      <div className="step-t">{s.t}</div>
      <div className="step-s">{s.s}</div>
    </m.div>
  );
}

function Process() {
  const wide = useMedia("(min-width: 861px)");
  const refs = useRef(DELIVERY.map(() => ({ current: null }))).current;
  return (
    <section className="band pad" id="process">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">How we work</span>
          <span className="ser">§ 03 · five steps</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">Five steps. <em className="foil">No surprises.</em></h2>
          <p className="lead">
            Every engagement runs the same way: we understand the real problem before
            touching a tool, research the right solution, and build in short cycles —
            validated continuously, delivered fast, supported after.
          </p>
        </Reveal>
        <div className="stack-rows">
          {DELIVERY.map((s, i) => (
            <StackRow
              key={s.k}
              s={s}
              i={i}
              n={DELIVERY.length}
              rowRef={refs[i]}
              nextRef={refs[Math.min(i + 1, DELIVERY.length - 1)]}
              wide={wide}
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
          <span className="ser">§ 04</span>
        </Reveal>
        <div className="contact-grid">
          <Reveal>
            <h2 className="h1">
              Your challenges are unique. <em className="foil">Your solution should be too.</em>
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              We combine business expertise, data, technology and AI to deliver solutions that
              are practical, scalable and aligned with your goals — then prove it with systems
              that are still running today.
            </p>
            <div className="values">
              {["Precise", "Accurate", "Agile", "Reliable"].map((v) => (
                <span className="tag" key={v}>{v}</span>
              ))}
            </div>
            <p className="close-line">
              Let&rsquo;s turn your business challenges into measurable opportunities.
            </p>
            <div className="reach">
              <a href="mailto:kavita@dataquin.com"><span className="k">Mail</span>kavita@dataquin.com</a>
              <a href="tel:+19086720809"><span className="k">Tel</span>+1 908 672 0809</a>
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

function Closing() {
  return (
    <section className="band dark cta-band pad">
      <span className="cta-glow" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <span className="mlabel">The work</span>
          <h2 className="cta-h">
            Six systems. The exact stack.<br />
            <em className="foil">The measured impact.</em>
          </h2>
          <p className="cta-s">
            One page holds every case study, the tools behind each one and the numbers
            they delivered — open for you to read.
          </p>
          <Magnetic>
            <Link to="/work" className="btn btn-gold btn-shine">Explore the work</Link>
          </Magnetic>
          <div className="cta-meta">
            <span>{TECH.length} tools</span>
            <span>six production builds</span>
            <span>90%+ faster delivery</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  usePageMeta({
    title: "DataQuin — Data · Automation · AI Engineering",
    description:
      "DataQuin turns manual days into automated hours — dashboards and reporting, system-to-system integration and AI pipelines for professional services firms, proven with six production builds.",
    path: "/",
  });

  return (
    <>
      <HeroStory />
      <ServicesStrip />
      <Proof />
      <Process />
      <Contact />
      <Closing />
    </>
  );
}
