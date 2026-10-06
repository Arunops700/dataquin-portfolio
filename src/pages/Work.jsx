import { Link } from "react-router-dom";
import { Reveal, Magnetic, Email } from "../components/fx.jsx";
import { Chapter } from "../components/work/Chapter.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { CONTACT } from "../data/site.js";
import { usePageMeta, PAGE_META } from "../seo.js";
import "../styles/work.css";

/* The Case Studies page (/case-studies): the case studies only. It opens on the problems
   intro (its heading is the page's h1) and its index, then the
   chapters, alternating paper and espresso. One long scroll;
   orientation comes from the chapters' own sticky numerals on desktops
   and, at every width, the top bar's island, which shows the section
   being read. */

/* The page opens here, one screen on desktops (.screen, as the landing's
   sections): what the chapters below are, and an index of them (a gilt
   spine on phones). No aria-label on the links: their
   visible text is their name. */
function Problems() {
  return (
    <section className="band dark pad screen probs" id="problems" data-island="Problems we’ve solved">
      <div className="wrap">
        <Reveal className="sec-intro">
          <h1 className="h1">Real problems. <em className="foil">Solved the modern way.</em></h1>
          <p className="lead">
            A selection from our work. Each one shows the problem, the solution we built with AI,
            automation and modern data tools, and how it works.
          </p>
        </Reveal>
        <nav className="ch-index" aria-label="Case studies">
          {STUDIES.map((s, i) => (
            <Link key={s.id} to={`/case-studies#cs-${s.num}`} className="ci-cell" style={{ "--i": i }}>
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
  // the description lives in data/work.js, shared with the page's static head
  usePageMeta(PAGE_META.work);

  return (
    <>
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
