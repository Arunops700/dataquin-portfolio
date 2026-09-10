import { Link, Navigate, useParams } from "react-router-dom";
import { Reveal, CountUp } from "../components/fx.jsx";
import Flow from "../components/Flow.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

function Metric({ m }) {
  return (
    <div className="metric-chip">
      <div className="v">{m.to != null ? <CountUp to={m.to} suffix={m.suffix || ""} /> : m.v}</div>
      <div className="k">{m.k}</div>
    </div>
  );
}

export default function CaseStudy() {
  const { id } = useParams();
  const idx = STUDIES.findIndex((s) => s.id === id);
  const s = idx === -1 ? null : STUDIES[idx];

  // Hooks must run on every render, so the metadata call sits above the
  // unknown-id redirect below rather than after it.
  usePageMeta({
    title: s ? `${s.title} · Case Study ${s.num}` : "Case Studies",
    description: s ? `${s.tagline}. ${s.card.line}` : "DataQuin case studies.",
    path: s ? `/projects/${s.id}` : "/projects",
  });

  if (!s) return <Navigate to="/projects" replace />;

  const prev = STUDIES[(idx - 1 + STUDIES.length) % STUDIES.length];
  const next = STUDIES[(idx + 1) % STUDIES.length];

  return (
    <>
      {/* ===== HEADER ===== */}
      <section className="wrap" style={{ padding: "88px 0 40px" }}>
        <div className="kicker fade-in">Case Study {s.num} · {s.type}</div>
        <h1 className="h-hero hero-title" style={{ maxWidth: 860 }}>
          {/* `roman`: the whole title is gold, not an emphasized aside —
              it stays upright while inline gold phrases go italic. */}
          <span className="row"><span className="grad-text roman">{s.title}</span></span>
        </h1>
        <p className="lead fade-in" style={{ marginTop: 20 }}>{s.tagline}.</p>
      </section>

      {/* ===== STORY ===== */}
      <section className="wrap" style={{ paddingBottom: 28 }}>
        <Reveal as="article" className="proj" style={{ marginBottom: 0 }}>
          <div className="proj-body">
            <div className="proj-text">
              <div className="toolbox-title" style={{ marginBottom: 14 }}>The story</div>
              {s.intro.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <ul className="proj-points">
                {s.points.map(([strong, rest]) => (
                  <li key={strong}><span><strong>{strong}</strong>{rest}</span></li>
                ))}
              </ul>
            </div>
            <div className="proj-side">
              <div className="metric-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {s.metrics.map((m) => <Metric key={m.k} m={m} />)}
              </div>
              <div className="toolbox">
                <div className="toolbox-title">Tools used</div>
                {s.tools.map(([name, desc]) => (
                  <div className="tb-row" key={name}>
                    <span className="tb-name">{name}</span>
                    <span className="tb-desc">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="proj-flow">
            <div className="toolbox-title" style={{ marginBottom: 18 }}>System flow</div>
            <Flow nodes={s.flow.nodes} edges={s.flow.edges} />
          </div>
        </Reveal>
      </section>

      {/* ===== PREV / NEXT ===== */}
      <section className="wrap section-tight">
        <div className="csnav">
          <Link to={`/projects/${prev.id}`} className="csnav-card">
            <span className="csnav-dir">← Previous case study</span>
            <span className="csnav-title">{prev.num} · {prev.title}</span>
          </Link>
          <Link to={`/projects/${next.id}`} className="csnav-card right">
            <span className="csnav-dir">Next case study →</span>
            <span className="csnav-title">{next.num} · {next.title}</span>
          </Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 34 }}>
          <Link to="/projects" className="btn btn-ghost">All Case Studies</Link>
        </div>
      </section>
    </>
  );
}
