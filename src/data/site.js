/*
  Site-wide content that is not a case study: the hero's story beats,
  the service pillars, hero credentials, the delivery steps, the values
  and the tech index. Case studies live in caseStudies.js. The counts
  the copy states (areas, steps, tools) are derived from these lists
  (format.js), so they can't go stale.
*/

/* The one place the contact details live. index.html (noscript copy
   and JSON-LD) is static and repeats them — keep the two in step. */
export const CONTACT = {
  email: "kavita@dataquin.com",
  phone: "+1 908 672 0809",
  phoneHref: "tel:+19086720809",
};

/* The scroll story played over the 3D field in the landing hero.
   `range` is the slice of the hero's scroll progress each beat owns. */
export const STORY_BEATS = [
  {
    k: "How we work",
    t: "Precise, accurate,",
    em: "agile and reliable.",
    s: "Our PAAR promise: a dedicated engagement lead, one team across onshore and offshore, and a value-based cost model focused on measurable ROI.",
    range: [0.19, 0.46],
  },
  {
    k: "What we do",
    t: "Data and analytics,",
    em: "now powered by AI.",
    s: "Commercial operations, patient support, analytics and insights, targeting and field reporting — joined by integrations, pipelines and AI agents.",
    range: [0.47, 0.72],
  },
  {
    k: "The result",
    t: "Manual days become",
    em: "automated hours.",
    s: "A few of the problems we've solved with AI, automation and modern data tools, not the traditional way. Each one measured and secured.",
    range: [0.74, 1],
    cta: true,
  },
];

/* The pillars — Kavita's list, every one stays. The one-line
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

/* The hero credentials. The case studies are a selection, not the whole
   body of work, so no credential counts them. */
export const CREDS = [
  { v: "25+", k: "Years of experience" },
  { v: String(PILLARS.length), k: "Service areas" },
  { v: "100%", k: "Confidential & discreet" },
];

/* The delivery steps, Kavita's wording. Short form for the landing rows. */
export const DELIVERY = [
  { k: "understand", t: "Understand", s: "We sit with your team and understand the real problem before touching a tool." },
  { k: "research", t: "Research", s: "We study the options — tools, integrations, AI approaches — and design the solution that fits your systems." },
  { k: "build", t: "Build", s: "AI-accelerated delivery in short cycles. Working software in days, not at the end of a long engagement." },
  { k: "validate", t: "Validate", s: "Continuous checks on data, measures and security. One review cycle, because it's right the first time." },
  { k: "deliver", t: "Deliver & Grow", s: "We go live, train your team to drive it themselves, and stay on as your estate grows." },
];

/* The firm's values, ruled into one line beside the contact form. */
export const VALUES = ["Precise", "Accurate", "Agile", "Reliable"];

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

/* The tech stack: every tool, its discipline (CATS) and what we use it for. */
export const TECH = [
  { ico: "python.svg", name: "Python", role: "The automation engine — pipelines, matching, ad-hoc delivery", cat: "data" },
  { ico: "sql.svg", name: "SQL", role: "Querying, staging & modeling across SQL Server / MySQL", cat: "data" },
  { ico: "powerbi.svg", name: "Power BI", role: "Dashboards, DAX, clean data models & role-based access", cat: "data" },
  { ico: "excel.svg", name: "Excel + VBA", role: "Advanced modeling and macros that erase manual work", cat: "data" },
  { ico: "pandas.svg", name: "pandas / Dask / Polars", role: "Fast data handling — from workbooks to 4GB+ datasets", cat: "data" },
  { ico: "salesforce.svg", name: "Salesforce", role: "CRM data & reporting integration", cat: "data" },

  { ico: "powerautomate.svg", name: "Power Automate", role: "Scheduled & event-driven flows across Microsoft 365", cat: "auto" },
  { ico: "restapi.svg", name: "REST APIs", role: "Platform, workflow & storage APIs — read, match, write back", cat: "auto" },
  { ico: "fastapi.svg", name: "FastAPI", role: "Automation services & always-on detection pipelines", cat: "auto" },

  { ico: "claude.svg", name: "Claude Code", role: "AI engineering + MCP servers — NL request to live dashboard", cat: "ai" },
  { ico: "mcp.svg", name: "Power BI MCP Server", role: "Automated DAX, programmatic RLS, continuous validation", cat: "ai" },
  { ico: "antigravity.svg", name: "Antigravity", role: "Agentic development platform", cat: "ai" },
  { ico: "githubcopilot.svg", name: "GitHub Copilot", role: "AI-assisted development in the IDE", cat: "ai" },
  { ico: "mscopilot.svg", name: "Microsoft Copilot", role: "M365-embedded AI — mail & Teams extraction workflows", cat: "ai" },
  { ico: "coworker.svg", name: "AI Coworker", role: "Skill-based documentation agent — writes to Confluence via MCP", cat: "ai" },
  { ico: "aiml.svg", name: "AI / ML Models", role: "Anomaly detection, scoring & summarization", cat: "ai" },

  { ico: "aws.svg", name: "AWS", role: "Cloud data services & compute", cat: "cloud" },
  { ico: "azure.svg", name: "Azure", role: "Microsoft cloud ecosystem", cat: "cloud" },
  { ico: "fabric.svg", name: "Microsoft Fabric", role: "Unified analytics — OneLake, pipelines, Power BI", cat: "cloud" },
  { ico: "sharepoint.svg", name: "SharePoint", role: "Automated, centralized reporting environments", cat: "cloud" },
  { ico: "mysql.svg", name: "SQL Server / MySQL", role: "Secure structured storage behind every pipeline", cat: "cloud" },
];

