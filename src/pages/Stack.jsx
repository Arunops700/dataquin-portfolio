import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, Panel } from "../components/fx.jsx";
import { DeliveryPath } from "../components/Delivery.jsx";
import { STUDIES } from "../data/caseStudies.js";
import { usePageMeta } from "../seo.js";

const DELIVERY = [
  { k: "understand", t: "Understand", s: "sit with your team and understand the real problem" },
  { k: "research", t: "Research", s: "study the options and design the right solution" },
  { k: "build", t: "Build", s: "develop it in short, AI-accelerated cycles" },
  { k: "validate", t: "Validate", s: "test everything — data, security and results" },
  { k: "deliver", t: "Deliver & Grow", s: "go live, hand over, and support as you grow" },
];

const CATS = {
  data: "Data & BI",
  auto: "Automation & Integration",
  ai: "AI & Dev Tools",
  cloud: "Cloud & Databases",
};

/* Each tech links to the case study where it's proven in production.
   Labels are derived from the case-study data, so renumbering or
   reordering STUDIES can never leave a stale "Case Study 0N" here. */
const PROJ = Object.fromEntries(
  STUDIES.map((s) => [s.id, `Case Study ${s.num}`])
);

const TECH = [
  { ico: "python.svg", name: "Python", role: "The automation engine — pipelines, matching, ad-hoc delivery", cat: "data", proj: "teammate" },
  { ico: "sql.svg", name: "SQL", role: "Querying, staging & modeling across SQL Server / MySQL", cat: "data", proj: "teammate" },
  { ico: "powerbi.svg", name: "Power BI", role: "Dashboards, DAX, clean data models & role-based access", cat: "data", proj: "bi-delivery" },
  { ico: "excel.svg", name: "Excel + VBA", role: "Advanced modeling and macros that erase manual work", cat: "data", proj: "teammate" },
  { ico: "pandas.svg", name: "pandas / Dask / Polars", role: "Fast data handling — from workbooks to 4GB+ datasets", cat: "data", proj: "alerting" },
  { ico: "salesforce.svg", name: "Salesforce", role: "CRM data & reporting integration", cat: "data", proj: "modernization" },

  { ico: "powerautomate.svg", name: "Power Automate", role: "Scheduled & event-driven flows across Microsoft 365", cat: "auto", proj: "engageai" },
  { ico: "restapi.svg", name: "REST APIs", role: "Platform, workflow & storage APIs — read, match, write back", cat: "auto", proj: "teammate" },
  { ico: "fastapi.svg", name: "FastAPI", role: "Automation services & always-on detection pipelines", cat: "auto", proj: "alerting" },

  { ico: "claude.svg", name: "Claude Code", role: "AI engineering + MCP servers — NL request to live dashboard", cat: "ai", proj: "bi-delivery" },
  { ico: "mcp.svg", name: "Power BI MCP Server", role: "Automated DAX, programmatic RLS, continuous validation", cat: "ai", proj: "bi-delivery" },
  { ico: "antigravity.svg", name: "Antigravity", role: "Agentic development platform", cat: "ai", proj: "bi-delivery" },
  { ico: "githubcopilot.svg", name: "GitHub Copilot", role: "AI-assisted development in the IDE", cat: "ai", proj: "bi-delivery" },
  { ico: "mscopilot.svg", name: "Microsoft Copilot", role: "M365-embedded AI — mail & Teams extraction workflows", cat: "ai", proj: "engageai" },
  { ico: "coworker.svg", name: "Copilot (Coworker)", role: "Skill-based documentation agent — writes to Confluence via MCP", cat: "ai", proj: "coworker" },
  { ico: "aiml.svg", name: "AI / ML Models", role: "Anomaly detection, scoring & summarization", cat: "ai", proj: "alerting" },

  { ico: "aws.svg", name: "AWS", role: "Cloud data services & compute", cat: "cloud", proj: "modernization" },
  { ico: "azure.svg", name: "Azure", role: "Microsoft cloud ecosystem", cat: "cloud", proj: "modernization" },
  { ico: "fabric.svg", name: "Microsoft Fabric", role: "Unified analytics — OneLake, pipelines, Power BI", cat: "cloud", proj: "modernization" },
  { ico: "sharepoint.svg", name: "SharePoint", role: "Automated, centralized reporting environments", cat: "cloud", proj: "modernization" },
  { ico: "mysql.svg", name: "SQL Server / MySQL", role: "Secure structured storage behind every pipeline", cat: "cloud", proj: "alerting" },
];

/* Scrolling tool marquee — content doubled for a seamless loop */
function Marquee() {
  const items = TECH.filter((t) => !t.name.includes("/"));
  const strip = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {strip.map((t, i) => (
          <span className="mq-item" key={i}>
            <img src={`/icons/${t.ico}`} alt="" loading="lazy" />
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Stack() {
  const [cat, setCat] = useState("all");
  usePageMeta({
    title: "DataQuin",
    description:
      "DataQuin builds dashboards and reporting, system-to-system integrations and AI pipelines for firms tired of copy-paste workflows — and proves every claim with a production build.",
    path: "/",
  });
  const list = useMemo(
    () => (cat === "all" ? TECH : TECH.filter((t) => t.cat === cat)),
    [cat]
  );

  return (
    <>
      {/* ===== EDITORIAL HERO — the type is the design ===== */}
      <section className="wrap hero-ed">
        <div className="hero-badges fade-in" style={{ animationDelay: "0.1s" }}>
          <span className="hero-badge">Data Engineering</span>
          <span className="hero-badge">Automation</span>
          <span className="hero-badge">Applied AI</span>
        </div>
        <h1 className="h-display hero-title">
          <span className="row"><span>We turn <em>manual days</em></span></span>
          <span className="row"><span>into <em>automated hours.</em></span></span>
        </h1>
        <p className="lead hero-desc fade-in" style={{ maxWidth: 720 }}>
          DataQuin builds dashboards and reporting, system-to-system integrations and AI
          pipelines for firms that are tired of copy-paste workflows — and proves every
          claim with a production build.
        </p>
        <div className="hero-actions fade-in">
          <Link to="/projects" className="btn btn-grad">View Case Studies</Link>
          <Link to="/impact" className="btn btn-ghost">See the Impact</Link>
        </div>
      </section>

      {/* ===== TOOL MARQUEE ===== */}
      <Marquee />

      {/* ===== HOW WE DELIVER ===== */}
      <section className="wrap section">
        <div className="deliver-grid">
          <Reveal className="deliver-copy">
            <div className="kicker">How we deliver</div>
            <h2 className="h1">Five steps. <span className="grad-text">No surprises.</span></h2>
            <p className="lead" style={{ marginTop: 16 }}>
              Every engagement runs the same way: we understand the real problem before
              touching a tool, research the right solution, and build in short cycles —
              validated continuously, delivered fast, supported after.
            </p>
          </Reveal>
          <Reveal delay={1}>
            <Panel className="hero-pipe">
              <DeliveryPath steps={DELIVERY} />
            </Panel>
          </Reveal>
        </div>
      </section>

      {/* ===== EVOLUTION SUMMARY ===== */}
      <section className="wrap section-tight" style={{ paddingTop: 0 }}>
        <Reveal className="section-head">
          <div className="kicker">Who we are</div>
          <h2 className="h1">Technology keeps evolving. <span className="grad-text">So do we.</span></h2>
          <p className="lead" style={{ marginTop: 14, maxWidth: 760 }}>
            DataQuin was built on a simple habit: every time the data landscape shifts, we master
            the new layer and put it into production. From spreadsheet automation to dashboards and reporting,
            from system-to-system integration to AI engineering — as the stack evolves, so does
            the way we deliver. Our clients never have to catch up, because we already have.
          </p>
        </Reveal>
        <div className="evo">
          <Reveal className="evo-step">
            <div className="era">Chapter 01</div>
            <div className="t">Spreadsheets &amp; VBA</div>
            <div className="s">Advanced modeling and macros — erasing the first layer of manual work.</div>
          </Reveal>
          <Reveal className="evo-step" delay={1}>
            <div className="era">Chapter 02</div>
            <div className="t">Dashboards &amp; Reporting</div>
            <div className="s">Power BI, DAX and role-based access — one version of the truth.</div>
          </Reveal>
          <Reveal className="evo-step" delay={2}>
            <div className="era">Chapter 03</div>
            <div className="t">Integration &amp; Automation</div>
            <div className="s">APIs, Python bridges and Power Automate — systems that talk to each other.</div>
          </Reveal>
          <Reveal className="evo-step now" delay={3}>
            <div className="era"><span className="evo-dot"></span>Chapter 04 · Now</div>
            <div className="t">Applied AI</div>
            <div className="s">Claude Code, MCP servers and AI pipelines — delivery measured in hours, not weeks.</div>
          </Reveal>
        </div>
      </section>

      {/* ===== TECH GRID ===== */}
      <section className="wrap section" id="arsenal">
        <Reveal className="section-head">
          <div className="kicker">Tech stack</div>
          <h2 className="h1">The tools <span className="grad-text">we build with.</span></h2>
          <p className="lead" style={{ marginTop: 14 }}>
            Every tool below is proven in a production build — click any card to jump straight
            to the project where we used it.
          </p>
        </Reveal>

        <div className="filters">
          <button className={`filter-btn ${cat === "all" ? "active" : ""}`}
            aria-pressed={cat === "all"} onClick={() => setCat("all")}>
            all<span className="count">{TECH.length}</span>
          </button>
          {Object.entries(CATS).map(([key, label]) => (
            <button key={key} className={`filter-btn ${cat === key ? "active" : ""}`}
              aria-pressed={cat === key} onClick={() => setCat(key)}>
              {label}<span className="count">{TECH.filter((t) => t.cat === key).length}</span>
            </button>
          ))}
        </div>

        <div className="tech-grid" key={cat}>
          {list.map((t, i) => (
            <Link
              className="tech-card"
              key={t.name}
              to={`/projects/${t.proj}`}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
            >
              <span className="tech-ico">
                <img src={`/icons/${t.ico}`} alt={t.name} loading="lazy" />
              </span>
              <div className="tech-info">
                <div className="tech-name">{t.name}</div>
                <div className="tech-role">{t.role}</div>
                <div className="tech-go">
                  Proven in {PROJ[t.proj]} <span className="arr" aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="wrap section-tight">
        <Reveal className="cta-strip">
          <div>
            <h2 className="h1">See the stack <span className="grad-text">in production.</span></h2>
            <div className="mono-note">Six builds · secured · shipped · measured</div>
          </div>
          <Link to="/projects" className="btn btn-grad">Explore the Case Studies →</Link>
        </Reveal>
      </section>
    </>
  );
}
