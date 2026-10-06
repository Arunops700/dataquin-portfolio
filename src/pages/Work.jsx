import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, Magnetic, Email } from "../components/fx.jsx";
import { Chapter } from "../components/work/Chapter.jsx";
import { Stack } from "../components/work/Stack.jsx";
import { Field } from "../three/Field.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { CONTACT } from "../data/site.js";
import { useMedia } from "../motion/prefs.js";
import { MQ } from "../motion/tokens.js";
import { usePageMeta, PAGE_META } from "../seo.js";
import "../styles/work.css";

/* The detail page: how we've grown and the stack, then the problems it
   solved — the case-study chapters, alternating paper and espresso. One
   long scroll; orientation comes from the chapters' own sticky numerals
   on desktops and, at every width, the top bar's island, which shows the
   section being read. */

/* On screen or not, from EVERY observer entry. framer's useInView with
   initial: true drops a first "not intersecting" entry, so a page
   opened mid-way (a deep link, a restored Back) kept believing the hero
   was on screen, and the 3D drew off-screen. */
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

/* The hero. Exactly one 3D mark per page: beside the copy above 860px,
   in a ruled band above the headline below it. */
function WorkHero({ heroRef, heroIn, aboveTablet }) {
  return (
    <section className="band dark hero-band hero-sub hero-work pad-b" ref={heroRef} data-island="The work"
      data-live={heroIn || undefined}>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-aura" aria-hidden="true" />
      {aboveTablet && <Field place="aside" active={heroIn} />}
      <div className="stage-scrim" aria-hidden="true" />
      <div className="wrap">
        {!aboveTablet && <Field place="band" active={heroIn} />}
        <h1 className="h-xl sm hero-title">
          <span className="row"><span>Our stack.</span></span>
          <span className="row"><span><em className="foil">The problems we&rsquo;ve solved.</em></span></span>
        </h1>
        <p className="lead hero-lead fade-in">
          First, the technology we work with every day. Then a selection of problems we&rsquo;ve
          solved with it — using AI, automation and modern data tools, not the traditional way.
        </p>
      </div>
    </section>
  );
}

/* The second part opens here: what the chapters below are, and an index
   of them (a gilt spine on phones). No aria-label on the links: their
   visible text is their name. */
function Problems() {
  return (
    <section className="band dark pad probs" id="problems" data-island="Problems we’ve solved">
      <div className="wrap">
        <Reveal className="sec-intro">
          <h2 className="h1">Real problems. <em className="foil">Solved the modern way.</em></h2>
          <p className="lead">
            A selection from our work. Each one shows the problem, the solution we built with AI,
            automation and modern data tools, and how it works.
          </p>
        </Reveal>
        <nav className="ch-index" aria-label="Case studies">
          {STUDIES.map((s, i) => (
            <Link key={s.id} to={`/work#cs-${s.num}`} className="ci-cell" style={{ "--i": i }}>
              <span className="ci-num">CS·{s.num}</span>
              <span className="ci-arr" aria-hidden="true">→</span>
              <span className="ci-type">{s.title}</span>
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
  const aboveTablet = useMedia(MQ.aboveTablet);
  // The hero starts on screen, so nothing flashes before the first
  // observation. The 3D field renders while any of the hero shows.
  const heroIn = useOnScreen(heroRef, "0px");

  return (
    <>
      <WorkHero heroRef={heroRef} heroIn={heroIn} aboveTablet={aboveTablet} />
      <Stack />
      <Problems />
      {STUDIES.map((s, i) => <Chapter key={s.id} s={s} i={i} />)}

      {/* The close speaks to what the reader has just read: a problem
          like these, and one way to start. Its glow stays still here
          (no data-live; work.css). */}
      <section className="band dark cta-band cta-next cta-home pad" id="work-close" data-island="Your turn">
        <span className="cta-glow" aria-hidden="true" />
        <div className="wrap">
          <Reveal className="cta-copy">
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
            {/* or straight to us, one tap: the contact section's Mail / Tel pair */}
            <div className="cta-reach">
              <a href={`mailto:${CONTACT.email}`}><span className="k">Mail</span><Email address={CONTACT.email} /></a>
              <a href={CONTACT.phoneHref}><span className="k">Tel</span>{CONTACT.phone}</a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
