import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, Magnetic, Arrowed } from "../components/fx.jsx";
import { Chapter } from "../components/work/Chapter.jsx";
import { Stack } from "../components/work/Stack.jsx";
import { Rail, ChapterBar, onRail } from "../components/work/Orientation.jsx";
import { Field } from "../three/Field.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { CATS, TECH } from "../data/site.js";
import { cap, countWord } from "../data/format.js";
import { useMedia } from "../motion/prefs.js";
import { MQ } from "../motion/tokens.js";
import { usePageMeta, PAGE_META } from "../seo.js";

/* The detail page: the case-study chapters, alternating paper and
   espresso, then the stack. One long scroll;
   orientation comes from a contents rail on wide screens, the chapters'
   own sticky numerals on desktops, and a chapter bar under the topbar
   at 1080px and below. */

const BAR_H = { tablet: 32, desktop: 34 }; // .ch-bar heights in work.css

/* On screen or not, from EVERY observer entry. framer's useInView with
   initial: true drops a first "not intersecting" entry, so a page
   opened mid-way (a deep link, a restored Back) kept believing the hero
   was on screen: the 3D drew off-screen and the rail never showed. */
function useOnScreen(ref, rootMargin) {
  const [on, setOn] = useState(true); // a plain visit opens on the hero
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => setOn(entries[entries.length - 1].isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return on;
}

/* The hero, memoised so the rail's active entry doesn't re-render it.
   Exactly one 3D mark per page: beside the copy above 860px, in a ruled
   band above the headline below it. */
const WorkHero = memo(function WorkHero({ heroRef, heroIn, aboveTablet }) {
  return (
    <section className="band dark hero-band hero-sub hero-work pad-b" ref={heroRef} data-tone="dark"
      data-live={heroIn || undefined}>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-aura" aria-hidden="true" />
      {aboveTablet && <Field place="aside" active={heroIn} />}
      <div className="stage-scrim" aria-hidden="true" />
      <div className="wrap">
        <div className="hero-meta fade-in">
          <span><b>The work</b> — our stack, and the problems it solved</span>
          <span>DQ / 02</span>
        </div>
        {!aboveTablet && <Field place="band" active={heroIn} />}
        <h1 className="h-xl sm hero-title">
          <span className="row"><span>Our stack.</span></span>
          <span className="row"><span><em className="foil">The problems we&rsquo;ve solved.</em></span></span>
        </h1>
        <p className="lead hero-lead fade-in">
          First, the technology we work with every day. Then a selection of problems we&rsquo;ve
          solved with it — using AI, automation and modern data tools, not the traditional way.
        </p>
        {/* The page in two parts, as a contents page of ruled cells */}
        <nav className="ch-index toc" aria-label="On this page">
          <Link to="/work#stack" className="ci-cell" style={{ "--i": 0 }}>
            <span className="ci-num">§ 01</span>
            <span className="ci-arr" aria-hidden="true">→</span>
            <span className="ci-type">Tech stack</span>
            <span className="ci-fig">{cap(countWord(TECH.length))} tools · {countWord(Object.keys(CATS).length)} disciplines</span>
          </Link>
          <Link to="/work#problems" className="ci-cell" style={{ "--i": 1 }}>
            <span className="ci-num">§ 03</span>
            <span className="ci-arr" aria-hidden="true">→</span>
            <span className="ci-type">Problems we&rsquo;ve solved</span>
            <span className="ci-fig">{cap(countWord(STUDIES.length))} case studies</span>
          </Link>
        </nav>
      </div>
    </section>
  );
});

/* The second part opens here: what the chapters below are, and an index
   of them (a gilt spine on phones). No aria-label on the links: their
   visible text is their name. */
function Problems() {
  return (
    <section className="band dark pad probs" id="problems" data-tone="dark">
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Problems we&rsquo;ve solved</span>
          <span className="ser">§ 03 · {countWord(STUDIES.length)} case studies</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">Real problems. <em className="foil">Solved the modern way.</em></h2>
          <p className="lead">
            A selection from our work. Each chapter sets out the problem, the solution we built
            with AI, automation and modern data tools, and the system behind it.
          </p>
        </Reveal>
        <nav className="ch-index" aria-label="Case studies">
          {STUDIES.map((s, i) => (
            <Link key={s.id} to={`/work#cs-${s.num}`} className="ci-cell" style={{ "--i": i }}>
              <span className="ci-num">CS·{s.num}</span>
              <span className="ci-arr" aria-hidden="true">→</span>
              <span className="ci-type">{s.type}</span>
              {/* no ledger strike for card.metric; its arrow is read as "to" */}
              <span className="ci-fig"><Arrowed text={s.card.metric} /></span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

export default function Work() {
  // the description lives in data/work.js, shared with the static /work head
  usePageMeta(PAGE_META.work);

  const heroRef = useRef(null);
  const bodyRef = useRef(null);
  const aboveTablet = useMedia(MQ.aboveTablet);
  const compact = useMedia(MQ.desktopDown);
  const wide = useMedia(MQ.wide);
  // The hero starts on screen, so nothing flashes before the first
  // observation. Field renders while any of the hero shows; orientation
  // appears once most of it has gone.
  const heroIn = useOnScreen(heroRef, "0px");
  const heroMostly = useOnScreen(heroRef, "0px 0px -40% 0px");
  const [active, setActive] = useState("stack");
  // the last section that is on the rail: the rail and the chapter bar
  // keep showing it while they fade out over the closing band
  const [mark, setMark] = useState("stack");

  /* With the chapter bar under the topbar, anchors need that much more
     clearance. A layout effect, so it is in place before the shell aims
     at a cold deep link (/work#cs-04); restored on the way out. */
  useLayoutEffect(() => {
    if (!compact) return;
    const html = document.documentElement;
    const prev = html.style.scrollPaddingTop;
    html.style.scrollPaddingTop = "";
    const base = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
    html.style.scrollPaddingTop = `${base + (aboveTablet ? BAR_H.desktop : BAR_H.tablet)}px`;
    return () => { html.style.scrollPaddingTop = prev; };
  }, [compact, aboveTablet]);

  // Which section the reader is in (a band 35–45% down the viewport).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-rail]"));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        setActive(hit.target.id);
        if (onRail(hit.target.id)) setMark(hit.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // hidden over the hero, and over the closing band and footer
  const show = !heroMostly && onRail(active);

  return (
    <>
      <WorkHero heroRef={heroRef} heroIn={heroIn} aboveTablet={aboveTablet} />

      {wide && <Rail active={mark} show={show} />}
      {compact && <ChapterBar active={mark} show={show} bodyRef={bodyRef} />}

      <div ref={bodyRef}>
        <Stack />
        <Problems />
        {STUDIES.map((s, i) => <Chapter key={s.id} s={s} i={i} />)}
      </div>

      {/* The close speaks to what the reader has just read: a problem
          like these, and one way to start */}
      <section className="band dark cta-band cta-next pad" id="work-close" data-rail data-tone="dark">
        <span className="cta-glow" aria-hidden="true" />
        <div className="wrap">
          <Reveal className="cta-copy">
            <span className="mlabel">Your turn</span>
            <h2 className="cta-h">
              Have a problem like these? <em className="foil">Let&rsquo;s solve it together.</em>
            </h2>
            <p className="cta-s">
              Tell us what&rsquo;s slowing your team down, and we&rsquo;ll show you how we would
              solve it — the modern way.
            </p>
            <div className="cta-act">
              <Magnetic>
                <Link to="/#contact" className="btn btn-gold btn-shine">Start a conversation</Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
