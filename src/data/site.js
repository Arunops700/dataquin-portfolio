/*
  Site-wide content that is not a case study: the seven service pillars,
  hero credentials, the five delivery steps, the tech index, the impact
  ledger and the two-journeys comparison. Case studies live in
  caseStudies.js; every number here that points at one does so by id, so
  renumbering can never leave a stale label behind.
*/
import { STUDIES } from "./caseStudies.js";

export const CREDS = [
  { v: "25+", k: "Years of experience" },
  { v: String(STUDIES.length), k: "Production systems live" },
  { v: "100%", k: "Confidential & discreet" },
];

/* The scroll story played over the 3D field in the landing hero.
   `range` is the slice of the hero's scroll progress each beat owns. */
export const STORY_BEATS = [
  {
    k: "The problem",
    t: "Every week, someone re-types",
    em: "what a system already knows.",
    s: "Figures copied between platforms. Reports rebuilt by hand. Alerts that wait for a person to notice.",
    range: [0.19, 0.46],
  },
  {
    k: "What we build",
    t: "One bridge, and the data",
    em: "moves on its own.",
    s: "Integrations, pipelines and AI agents that read, match and write back — validated on every run.",
    range: [0.47, 0.72],
  },
  {
    k: "The result",
    t: "Manual days become",
    em: "automated hours.",
    s: "Six production systems, live with professional services firms today. Measured, secured, still running.",
    range: [0.74, 1],
    cta: true,
  },
];

/* Seven pillars — Kavita's list, all seven stay. The one-line
   descriptors are new copy and should be read by her before launch. */
export const PILLARS = [
  { t: "Business Analytics", s: "Dashboards and reporting that leadership actually opens — one version of every number." },
  { t: "Data Science", s: "Forecasts, scoring and anomaly detection built on your own data, not a generic model." },
  { t: "AI Solutions", s: "Agents and copilots that take real work off the desk: documentation, alerts, weekly reports." },
  { t: "Automation", s: "Systems that talk to each other, so nobody re-types what a platform already knows." },
  { t: "Data Migration", s: "Move platforms and consolidate sources without losing a record or a definition." },
  { t: "Patient Support Services", s: "Patient-facing support programs, run with the same rigor we bring to systems." },
  { t: "Staffing", s: "The right people placed where the work is — analysts, developers, support teams." },
];

/* Five steps, Kavita's wording. Short form for the landing rows. */
export const DELIVERY = [
  { k: "understand", t: "Understand", s: "We sit with your team and understand the real problem before touching a tool." },
  { k: "research", t: "Research", s: "We study the options — tools, integrations, AI approaches — and design the solution that fits your systems." },
  { k: "build", t: "Build", s: "AI-accelerated delivery in short cycles. Working software in days, not at the end of a long engagement." },
  { k: "validate", t: "Validate", s: "Continuous checks on data, measures and security. One review cycle, because it's right the first time." },
  { k: "deliver", t: "Deliver & Grow", s: "We go live, train your team to drive it themselves, and stay on as your estate grows." },
];

/* Three studies shown as proof on the landing page, in chapter order. */
export const PROOF = ["teammate", "bi-delivery", "alerting"];

export const EVOLUTION = [
  { era: "Chapter 01", t: "Spreadsheets & VBA", s: "Advanced modeling and macros — erasing the first layer of manual work." },
  { era: "Chapter 02", t: "Dashboards & Reporting", s: "Power BI, DAX and role-based access — one version of the truth." },
  { era: "Chapter 03", t: "Integration & Automation", s: "APIs, Python bridges and Power Automate — systems that talk to each other." },
  { era: "Chapter 04 · Now", t: "Applied AI", s: "Claude Code, MCP servers and AI pipelines — delivery measured in hours, not weeks.", now: true },
];

export const CATS = {
  data: "Data & BI",
  auto: "Automation & Integration",
  ai: "AI & Dev Tools",
  cloud: "Cloud & Databases",
};

/* `proj` links a tool to the case study that actually uses it (the
   chapter names the tool). Tools without one are part of the stack but
   make no "proven in" claim — the row says so instead of pointing at a
   chapter that never mentions them. */
export const TECH = [
  { ico: "python.svg", name: "Python", role: "The automation engine — pipelines, matching, ad-hoc delivery", cat: "data", proj: "teammate" },
  { ico: "sql.svg", name: "SQL", role: "Querying, staging & modeling across SQL Server / MySQL", cat: "data", proj: "teammate" },
  { ico: "powerbi.svg", name: "Power BI", role: "Dashboards, DAX, clean data models & role-based access", cat: "data", proj: "bi-delivery" },
  { ico: "excel.svg", name: "Excel + VBA", role: "Advanced modeling and macros that erase manual work", cat: "data", proj: "modernization" },
  { ico: "pandas.svg", name: "pandas / Dask / Polars", role: "Fast data handling — from workbooks to 4GB+ datasets", cat: "data", proj: "teammate" },
  { ico: "salesforce.svg", name: "Salesforce", role: "CRM data & reporting integration", cat: "data" },

  { ico: "powerautomate.svg", name: "Power Automate", role: "Scheduled & event-driven flows across Microsoft 365", cat: "auto", proj: "engageai" },
  { ico: "restapi.svg", name: "REST APIs", role: "Platform, workflow & storage APIs — read, match, write back", cat: "auto", proj: "teammate" },
  { ico: "fastapi.svg", name: "FastAPI", role: "Automation services & always-on detection pipelines", cat: "auto" },

  { ico: "claude.svg", name: "Claude Code", role: "AI engineering + MCP servers — NL request to live dashboard", cat: "ai", proj: "bi-delivery" },
  { ico: "mcp.svg", name: "Power BI MCP Server", role: "Automated DAX, programmatic RLS, continuous validation", cat: "ai", proj: "bi-delivery" },
  { ico: "antigravity.svg", name: "Antigravity", role: "Agentic development platform", cat: "ai" },
  { ico: "githubcopilot.svg", name: "GitHub Copilot", role: "AI-assisted development in the IDE", cat: "ai" },
  { ico: "mscopilot.svg", name: "Microsoft Copilot", role: "M365-embedded AI — mail & Teams extraction workflows", cat: "ai" },
  { ico: "coworker.svg", name: "AI Coworker", role: "Skill-based documentation agent — writes to Confluence via MCP", cat: "ai", proj: "coworker" },
  { ico: "aiml.svg", name: "AI / ML Models", role: "Anomaly detection, scoring & summarization", cat: "ai", proj: "alerting" },

  { ico: "aws.svg", name: "AWS", role: "Cloud data services & compute", cat: "cloud" },
  { ico: "azure.svg", name: "Azure", role: "Microsoft cloud ecosystem", cat: "cloud" },
  { ico: "fabric.svg", name: "Microsoft Fabric", role: "Unified analytics — OneLake, pipelines, Power BI", cat: "cloud" },
  { ico: "sharepoint.svg", name: "SharePoint", role: "Automated, centralized reporting environments", cat: "cloud" },
  { ico: "mysql.svg", name: "SQL Server / MySQL", role: "Secure structured storage behind every pipeline", cat: "cloud", proj: "alerting" },
];

/* Every number traces back to a case study. */
export const IMPACTS = [
  { to: 90, suffix: "%+", label: "Faster BI delivery", sub: "A ready-to-use, secured dashboard in under 4 hours — the traditional route took 3–5 business days and ~28 hours of effort.", cs: "bi-delivery" },
  { v: "0", label: "Manual data entry", sub: "Project financials flow between the accounting and audit platforms on their own — matched, written back, always current.", cs: "teammate" },
  { v: "days → min", label: "Fraud detection to inbox", sub: "Fraud conditions scan the full dataset; AI writes the case report and sends the alert mail — automatically.", cs: "alerting" },
  { v: "<3h", label: "Weekly client reporting", sub: "Polished, classified activity reports assembled automatically from mail, calls and meetings — down from days.", cs: "engageai" },
  { v: "2 → 1", label: "Sources into one model", sub: "SQL Server and Excel data now feed a single Power BI model — every report shows one version of every number.", cs: "modernization" },
  { v: "hrs → min", label: "Per documentation page", sub: "Reports document themselves straight into Confluence — template-consistent and never out of date.", cs: "coworker" },
];

export const OLD_STEPS = [
  ["Intake & scoping", "ticket raised, queued, kickoff call", "Day 1"],
  ["Manual data extraction", "an analyst pulls and reshapes the data", "Day 2"],
  ["Build & manual security", "a developer builds; security set up by hand", "Days 3–4"],
  ["Review cycles", "2–3 rounds of corrections and rework", "Day 5"],
];

export const NEW_STEPS = [
  ["Describe it in plain English", "no ticket, no spec, no queue", "Minutes"],
  ["AI engine builds & secures", "data model, measures and security — validated continuously", "Hours"],
  ["One review, then live", "right the first time, stakeholders approve", "Same day"],
];

/* Anchor for a case study on the Work page. */
export const csHash = (id) => `#cs-${STUDIES.find((s) => s.id === id).num}`;
