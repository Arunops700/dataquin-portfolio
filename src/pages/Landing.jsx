import { useRef } from "react";
import { Link } from "react-router-dom";
import { m, useInView, useTransform } from "framer-motion";
import { useProgress } from "../motion/scroll.js";
import { Reveal, Magnetic, Email } from "../components/fx.jsx";
import ContactForm from "../components/ContactForm.jsx";
import FoilSheen from "../components/landing/FoilSheen.jsx";
import { Stack } from "../components/landing/Stack.jsx";
import { Field } from "../three/Field.jsx";
import {
  CREDS, PILLARS, DELIVERY, VALUES, CONTACT,
} from "../data/site.js";
import { STUDIES } from "../data/caseStudies.js";
import { cap, countWord, pad2 } from "../data/format.js";
import { PAGE_META, usePageMeta } from "../seo.js";

/* ============================================================
   HERO — who we are, what this page is, two ways on and the
   credentials, on one screen. The 3D mark owns the right, settled in
   its data streams, and turns as the hero scrolls away.
   ============================================================ */
function Hero() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "120px 0px 120px 0px" });
  // 0 → 1 as the hero leaves the screen: the sheen and the cue read it
  const p = useProgress(ref, ["start start", "end start"]);
  const cueO = useTransform(p, [0, 0.12], [1, 0]);

  return (
    <section className="hero-home band dark" ref={ref} data-live={inView || undefined} data-island="Who we are">
      <div className="stage">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-aura" aria-hidden="true" />
        <Field active={inView} />
        <div className="stage-scrim" aria-hidden="true" />

        <div className="wrap stage-copy">
          <h1 className="h-xl hero-title">
            <span className="row">
              <span>We are <FoilSheen progress={p} range={[0, 0.4]} intro>DataQuin.</FoilSheen></span>
            </span>
          </h1>
          <p className="lead hero-lead fade-in">
            25+ years of data management and analytics for pharmaceutical, healthcare,
            finance and professional services teams — now with automation and AI. This brief
            shows what we offer, what we&rsquo;ve built and the technology behind it.
          </p>
          <div className="hero-actions fade-in">
            <Magnetic><Link to="/case-studies" className="btn btn-gold btn-shine">See our case studies</Link></Magnetic>
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
        </div>

        <m.div className="scroll-cue" style={{ opacity: cueO }} aria-hidden="true">
          Scroll
        </m.div>
      </div>
    </section>
  );
}

/* ============================================================
   SERVICES — every area on one screen, in a hairline-ruled grid (a
   bento layout drawn as a ledger: rules, no boxes). The first area
   takes the large cell; nothing is pinned or driven by the scroll.
   Each cell is a link: to the case study that shows the area, or to
   the contact section.
   ============================================================ */
function Services() {
  const word = countWord(PILLARS.length);
  return (
    <section className="band deep screen" id="services" data-island="What we do">
      <div className="wrap">
        <Reveal className="sec-intro">
          <h2 className="h1">{cap(word)} ways in. <em className="foil">One standard.</em></h2>
        </Reveal>
        <ul className="sv-grid">
          {PILLARS.map((pl, i) => {
            const n = pad2(i + 1);
            const study = STUDIES.find((s) => s.num === pl.cs);
            return (
              <Reveal as="li" key={pl.t} className={i === 0 ? "sv-cell lg" : "sv-cell"} delay={i % 3}>
                <span className="sv-num num-ink" data-n={n} aria-hidden="true">{n}</span>
                <h3 className="sv-t">{pl.t}</h3>
                <p className="sv-s">{pl.s}</p>
                <span className="sv-arr arr" aria-hidden="true">→</span>
                {/* a router link (see the hero's note), laid over the whole
                    cell; outside the title, whose hover shift would
                    otherwise shrink it to the title's box */}
                <Link to={study ? `/case-studies#cs-${study.num}` : "/#contact"} className="sv-go">
                  <span className="sr-only">
                    {pl.t}{study ? `, case study ${study.num}: ${study.title}` : ", talk to us"}
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================
   PROCESS — the steps on one screen: a ruled rail whose foil line draws
   through the step ticks as they arrive, each step a column below it.
   Nothing is pinned or driven by the scroll.
   ============================================================ */
function Process() {
  const word = countWord(DELIVERY.length);
  return (
    <section className="band deep screen" id="process" data-island="How we work">
      <div className="wrap">
        <Reveal className="sec-intro">
          <h2 className="h1">{cap(word)} steps. <em className="foil">No surprises.</em></h2>
          <p className="lead">
            Every engagement runs the same way: we understand the real problem before
            touching a tool, research the right solution, and build in short cycles —
            validated continuously, delivered fast, supported after.
          </p>
        </Reveal>
        <ol className="proc">
          {DELIVERY.map((st, i) => {
            const n = pad2(i + 1);
            return (
              <Reveal as="li" key={st.k} className="proc-step" delay={Math.min(i, 4)}>
                <span className="proc-num num-ink" data-n={n} aria-hidden="true">{n}</span>
                <h3 className="proc-t">{st.t}</h3>
                <p className="proc-s">{st.s}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ============================================================
   WHY + CONTACT — the last section, before the footer
   ============================================================ */
function Contact() {
  return (
    <section className="band screen" id="contact" data-island="Contact">
      <div className="wrap">
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
   CASE STUDIES — a dark band between the process and the contact
   section: the way on to the Case Studies page.
   ============================================================ */
function CaseStudies() {
  const ref = useRef(null);
  const p = useProgress(ref, ["start 90%", "center 45%"]);
  const live = useInView(ref); // the glow drifts only while the band is in view
  return (
    <section className="band dark cta-band cta-next pad" ref={ref} data-live={live || undefined}
      data-island="Case studies">
      <span className="cta-glow" aria-hidden="true" />
      <div className="wrap">
        <Reveal className="cta-copy">
          <h2 className="cta-h">
            See the problems <FoilSheen progress={p}>we&rsquo;ve solved.</FoilSheen>
          </h2>
          <p className="cta-s">
            {cap(countWord(STUDIES.length))} case studies — the problem, our solution and how it works,
            built with AI, automation and modern data tools, not the traditional way.
          </p>
          <div className="cta-act">
            <Magnetic>
              <Link to="/case-studies" className="btn btn-gold btn-shine">Explore the case studies</Link>
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
      <Hero />
      <Services />
      <Stack />
      <Process />
      <CaseStudies />
      <Contact />
    </>
  );
}
