import { Link } from "react-router-dom";
import { STUDIES } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

/* Previously any unknown URL rendered the landing page, so a typo or a
   stale link looked like the real homepage. This says what happened and
   offers the way back. */
export default function NotFound() {
  usePageMeta({
    title: "Page not found",
    description: "That page doesn't exist. Browse the DataQuin tech stack, case studies and measured impact instead.",
    path: "/404",
    noindex: true,
  });

  return (
    <section className="wrap" style={{ padding: "120px 0 80px" }}>
      <div className="kicker fade-in">Error 404</div>
      <h1 className="h-hero hero-title" style={{ maxWidth: 820 }}>
        <span className="row"><span>That page</span></span>
        <span className="row"><span className="grad-text">doesn't exist.</span></span>
      </h1>
      <p className="lead fade-in" style={{ marginTop: 22, maxWidth: 620 }}>
        The link may be out of date, or the address mistyped. Everything we've
        built is one click away.
      </p>

      <div className="hero-actions fade-in">
        <Link to="/" className="btn btn-grad">Home</Link>
        <Link to="/stack" className="btn btn-ghost">Tech Stack</Link>
        <Link to="/projects" className="btn btn-ghost">Case Studies</Link>
        <Link to="/impact" className="btn btn-ghost">Impact</Link>
      </div>

      <div className="nf-list">
        <div className="toolbox-title" style={{ marginBottom: 14 }}>All case studies</div>
        {STUDIES.map((s) => (
          <Link key={s.id} to={`/projects/${s.id}`} className="nf-link">
            <span className="nf-num">{s.num}</span>
            <span>{s.title}</span>
            <span className="nf-arr" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
