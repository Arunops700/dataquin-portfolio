import { Link } from "react-router-dom";
import { STUDIES } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

/* Any unknown URL — including the retired /stack, /projects and /impact
   addresses — says what happened and offers the way back. */
export default function NotFound() {
  usePageMeta({
    title: "Page not found",
    description: "That page doesn't exist. Browse the DataQuin case studies, tech stack and measured impact instead.",
    path: "/404",
    noindex: true,
  });

  return (
    <>
      <section className="band dark hero-band hero-sub pad-b">
        <div className="hero-grid" aria-hidden="true" />
        <div className="wrap">
          <div className="hero-meta fade-in">
            <span><b>Error 404</b> — nothing filed here</span>
            <span>DQ / 404</span>
          </div>
          <h1 className="h-xl hero-title" style={{ maxWidth: 820 }}>
            <span className="row"><span>That page</span></span>
            <span className="row"><span><em className="foil">doesn't exist.</em></span></span>
          </h1>
          <p className="lead hero-lead fade-in" style={{ maxWidth: 620 }}>
            The link may be out of date, or the address mistyped. Everything we've
            built is one click away.
          </p>
          <div className="hero-actions fade-in">
            <Link to="/" className="btn btn-gold">Home</Link>
            <Link to="/work" className="btn btn-line">The Work</Link>
            <Link to="/work#impact" className="btn btn-line">Impact</Link>
            <Link to="/#contact" className="btn btn-line">Contact</Link>
          </div>
        </div>
      </section>

      <section className="band pad-s">
        <div className="wrap">
          <div className="nf-list">
            <span className="mlabel">All case studies</span>
            {STUDIES.map((s) => (
              <Link key={s.id} to={`/work#cs-${s.num}`} className="nf-link">
                <span className="nf-num">{s.num}</span>
                <span>{s.title}</span>
                <span className="nf-arr" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
