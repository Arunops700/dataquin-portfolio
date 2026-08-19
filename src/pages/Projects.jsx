import { Link } from "react-router-dom";
import { Reveal } from "../components/fx.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

/* Overview list — every case study lives on its own page (/projects/:id).
   Rows are real <Link>s, not click-handlers on divs: middle-click and
   ctrl-click open a study in a new tab, and crawlers can follow them. */
export default function Projects() {
  usePageMeta({
    title: "Case Studies",
    description:
      "Six production systems built for professional services firms — cross-system integration, AI-accelerated BI delivery, fraud alerting, client activity reporting and more. Anonymized, measured, still running.",
    path: "/projects",
  });

  return (
    <>
      <section className="wrap" style={{ padding: "96px 0 48px" }}>
        <div className="kicker fade-in">Production builds</div>
        <h1 className="h-hero hero-title" style={{ maxWidth: 780 }}>
          <span className="row"><span>Systems we've shipped.</span></span>
          <span className="row"><span className="grad-text">Bottlenecks we've deleted.</span></span>
        </h1>
        <p className="lead fade-in" style={{ marginTop: 22 }}>
          Six production systems built for professional services firms — anonymized,
          measured, and still running today. Open any case study for the full story,
          the tools behind it and the system flow.
        </p>
      </section>

      {/* Editorial list — each case study is a large interactive row */}
      <section className="wrap section-tight" style={{ paddingTop: 0 }}>
        <div className="cs-rows">
          {STUDIES.map((s, i) => (
            <Reveal
              key={s.id}
              as={Link}
              to={`/projects/${s.id}`}
              className="cs-row"
              delay={Math.min(i, 4)}
            >
              <span className="cs-row-num">{s.num}</span>
              <span className="cs-row-main">
                <span className="cs-row-type">{s.type}</span>
                <span className="cs-row-title">{s.title}</span>
                <span className="cs-row-line">{s.card.line}</span>
              </span>
              <span className="cs-row-metric">{s.card.metric}</span>
              <span className="cs-row-arr" aria-hidden="true">→</span>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
