import { Link } from "react-router-dom";
import { Reveal, CountUp, Magnetic } from "../components/fx.jsx";
import { DeliveryPath } from "../components/Delivery.jsx";
import { getStudy } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

const ENGAGE = [
  { k: "understand", t: "Understand", s: "We start by listening: where does the time actually go, which steps are manual, and what does each bottleneck really cost?" },
  { k: "research", t: "Research", s: "We study the options — tools, integrations, AI approaches — and design the solution that fits your systems and your standards." },
  { k: "build", t: "Build", s: "AI-accelerated delivery in short cycles. Working software in days, not at the end of a long engagement." },
  { k: "validate", t: "Validate", s: "Continuous automated checks on data, measures and security. One review cycle, because it's right the first time." },
  { k: "deliver", t: "Deliver & Grow", s: "We go live, train your team to drive it themselves, and stay on as your estate grows." },
];

/* Every number traces back to a case study — impact you can verify.
   `cs` is the only link to the data; the displayed case-study number is
   read from STUDIES so it can't drift out of sync. */
const IMPACTS = [
  { to: 90, suffix: "%+", label: "Faster BI delivery", sub: "A ready-to-use, secured dashboard in under 4 hours — the traditional route took 3–5 business days and ~28 hours of effort.", cs: "bi-delivery" },
  { v: "0", label: "Manual data entry", sub: "Project financials flow between the accounting and audit platforms on their own — matched, written back, always current.", cs: "teammate" },
  { v: "days → min", label: "Fraud detection to inbox", sub: "Fraud conditions scan the full dataset; AI writes the case report and sends the alert mail — automatically.", cs: "alerting" },
  { v: "<3h", label: "Weekly client reporting", sub: "Polished, classified activity reports assembled automatically from mail, calls and meetings — down from days.", cs: "engageai" },
  { v: "2 → 1", label: "Sources into one model", sub: "SQL Server and Excel data now feed a single Power BI model — every report shows one version of every number.", cs: "modernization" },
  { v: "hrs → min", label: "Per documentation page", sub: "Reports document themselves straight into Confluence — template-consistent and never out of date.", cs: "coworker" },
];

const OLD_STEPS = [
  ["Intake & scoping", "ticket raised, queued, kickoff call", "Day 1"],
  ["Manual data extraction", "an analyst pulls and reshapes the data", "Day 2"],
  ["Build & manual security", "a developer builds; security set up by hand", "Days 3–4"],
  ["Review cycles", "2–3 rounds of corrections and rework", "Day 5"],
];

const NEW_STEPS = [
  ["Describe it in plain English", "no ticket, no spec, no queue", "Minutes"],
  ["AI engine builds & secures", "data model, measures and security — validated continuously", "Hours"],
  ["One review, then live", "right the first time, stakeholders approve", "Same day"],
];

export default function Impact() {
  usePageMeta({
    title: "Impact",
    description:
      "Measured outcomes from live client engagements: 90%+ faster BI delivery, zero manual data entry, fraud detection to inbox in minutes — each number tracing back to a case study you can read.",
    path: "/impact",
  });

  return (
    <>
      {/* ===== HEADER ===== */}
      <section className="wrap" style={{ padding: "96px 0 40px" }}>
        <div className="kicker fade-in">Measured outcomes</div>
        <h1 className="h-hero hero-title" style={{ maxWidth: 860 }}>
          <span className="row"><span>We don't sell effort.</span></span>
          <span className="row"><span className="grad-text">We sell outcomes.</span></span>
        </h1>
        <p className="lead fade-in" style={{ marginTop: 22 }}>
          Every build is judged on hours returned, errors removed and decisions unblocked.
          The numbers below come from live client engagements — and each one traces back
          to a case study you can read.
        </p>
      </section>

      {/* ===== IMPACT CARDS — dark statement band ===== */}
      <section className="wrap section-tight">
        <div className="impact-band">
        <div className="imp-grid">
          {IMPACTS.map((m, i) => (
            <Reveal
              key={m.cs + m.label}
              as={Link}
              to={`/projects/${m.cs}`}
              className="imp-card"
              delay={Math.min(i, 4)}
            >
              <div className="imp-num">
                {m.to != null ? <CountUp to={m.to} suffix={m.suffix || ""} /> : m.v}
              </div>
              <div className="imp-label">{m.label}</div>
              <div className="imp-sub">{m.sub}</div>
              <div className="imp-go">
                From Case Study {getStudy(m.cs).num} <span className="arr" aria-hidden="true">→</span>
              </div>
            </Reveal>
          ))}
        </div>
        </div>
      </section>

      {/* ===== TWO JOURNEYS ===== */}
      <section className="wrap section">
        <Reveal className="section-head">
          <div className="kicker">The difference in practice</div>
          <h2 className="h1">The same request, <span className="grad-text">two journeys.</span></h2>
          <p className="lead" style={{ marginTop: 14 }}>
            "I need a regional dashboard, secured per role, by Friday." Here is what
            actually happens next — with and without DataQuin.
          </p>
        </Reveal>
        <div className="journey">
          <Reveal className="j-col old">
            <span className="j-badge">The traditional route</span>
            <div className="j-steps">
              {OLD_STEPS.map(([t, d, time], i) => (
                <div className="j-step" key={t}>
                  <span className="n">{i + 1}</span>
                  <span className="j-body">
                    <span className="t">{t}</span>
                    <span className="d">{d}</span>
                  </span>
                  <span className="j-time">{time}</span>
                </div>
              ))}
            </div>
            <div className="j-total">
              <span className="k">Total</span>
              <span className="v">3–5 days · ~28 hrs effort</span>
            </div>
          </Reveal>
          <Reveal className="j-col new" delay={1}>
            <span className="j-badge">With DataQuin</span>
            <div className="j-steps">
              {NEW_STEPS.map(([t, d, time], i) => (
                <div className="j-step" key={t}>
                  <span className="n">{i + 1}</span>
                  <span className="j-body">
                    <span className="t">{t}</span>
                    <span className="d">{d}</span>
                  </span>
                  <span className="j-time">{time}</span>
                </div>
              ))}
            </div>
            <div className="j-total">
              <span className="k">Total</span>
              <span className="v">&lt;4 hours · &lt;3 hrs effort</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal className="section-head">
          <div className="kicker">How we engage</div>
          <h2 className="h1">How every build <span className="grad-text">runs.</span></h2>
        </Reveal>
        <Reveal className="panel engage-panel">
          <DeliveryPath steps={ENGAGE} big />
        </Reveal>
      </section>

      {/* ===== CLOSING ===== */}
      <section className="wrap section-tight">
        <Reveal className="cta-strip">
          <div>
            <h2 className="h1">Built once. <span className="grad-text">Running every day.</span></h2>
            <div className="mono-note">Six production systems · secured · validated · self-service</div>
          </div>
          <Magnetic><Link to="/projects" className="btn btn-grad">Back to the Case Studies →</Link></Magnetic>
        </Reveal>
      </section>
    </>
  );
}
