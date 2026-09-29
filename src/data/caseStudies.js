/*
  Single source of truth for the six case studies.
  Client-side product names are deliberately generic ("accounting platform",
  "audit platform") — prospects won't know niche vendor tools, and client
  environments stay anonymous. Widely-known tools (Power BI, Excel, Outlook,
  Teams, SharePoint) are fine to name.

  metrics: { to, suffix, k } animates a CountUp; { v, k } renders plain text.
  metrics[0] is the chapter's headline figure on the Work page.

  Arrow rule: in `metrics` an arrow always means
  before → after ("2 → 1", "hrs → min"); the Work page prints the old
  figure small and struck through, like a corrected ledger entry.
  `card.metric` is exempt — "detection → inbox" is a path, not a change.
*/
export const STUDIES = [
  {
    id: "teammate",
    num: "01",
    type: "System Integration",
    title: "Cross-System Data Integration",
    tagline: "Project financials that sync themselves between two disconnected platforms",
    card: {
      line: "Two disconnected platforms, one automated bridge — project financials sync themselves.",
      metric: "0 manual entry",
    },
    intro: [
      "Project financials — WIP amounts, WIP hours, fieldwork hours — lived in the firm's accounting platform. The audit team managed those same projects in a separate audit management system. The two platforms had no connection, so keeping records current meant re-typing figures by hand: slow, repetitive, error-prone. Worse, the records didn't line up — the audit system keys on an internal project ID, while the financial report only carries client and project names.",
      "We built an automated bridge. Power BI reads the accounting platform's database and builds the metrics; the audit platform's API supplies each project's ID; Python matches both feeds by client + project name and writes the results straight back. The loop closes itself — zero manual data entry.",
    ],
    points: [
      ["No manual entry", " — figures move between systems automatically"],
      ["Always current", " — the audit platform reflects the latest WIP & hours at any time"],
      ["Fewer errors", " — programmatic matching removes typing mistakes"],
      ["One source of truth", " — a single, consistent view of every project"],
    ],
    metrics: [
      { v: "0", k: "manual data entry" },
      { v: "2", k: "platforms kept in sync, one source of truth" },
      { to: 100, suffix: "%", k: "always current — WIP & hours" },
      { v: "auto", k: "runs unattended, end to end" },
    ],
    tools: [
      ["Python", "the automation engine — gathers, matches, writes back"],
      ["Excel", "the working format where both data feeds meet"],
      ["Accounting platform", "holds each project's WIP amounts and hours"],
      ["SQL Server", "the database behind the accounting platform"],
      ["Power BI", "builds the metrics and the exported financial report"],
      ["Audit platform", "source of project IDs and final destination"],
      ["Platform API", "the secure link used to read and write audit data"],
    ],
    flow: {
      nodes: [
        { id: "a", t: "Accounting System", s: "WIP amounts & hours", ab: "ACC", col: 0, row: 0 },
        { id: "t", t: "Audit Platform", s: "audit projects", ab: "AUD", col: 0, row: 1 },
        { id: "b", t: "SQL Server", s: "accounting database", ico: "sql.svg", col: 1, row: 0 },
        { id: "api", t: "Platform API", s: "project IDs", ico: "restapi.svg", col: 1, row: 1 },
        { id: "c", t: "Power BI", s: "metrics & report", ico: "powerbi.svg", col: 2, row: 0 },
        { id: "e", t: "Match Engine", s: "Python + pandas · client + project", ico: "python.svg", col: 3 },
        { id: "w", t: "API Write-back", s: "zero manual typing", ico: "restapi.svg", col: 4 },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "e" },
        { from: "t", to: "api" },
        { from: "api", to: "e" },
        { from: "e", to: "w" },
        { from: "w", to: "t", label: "auto-sync loop — always current" },
      ],
    },
  },

  {
    id: "bi-delivery",
    num: "02",
    type: "AI Engineering",
    title: "AI-Accelerated BI Delivery",
    tagline: "A plain-English request in — a secure, ready-to-use dashboard out",
    card: {
      line: "A plain-English request becomes a fully secured, ready-to-use dashboard — no developer queue.",
      metric: "days → <4 hrs",
    },
    intro: [
      "“I need a regional sales dashboard with row-level security by Friday — can you pull the data and build it in Power BI?” At most firms that request travels through five roles, ~28 hours of effort and 3–5 business days: intake, extraction, build, 2–3 review cycles, manual security setup.",
      "We built an AI-powered engine — Power BI MCP Server + Claude Code — that takes the same request and handles the data model, DAX measures, programmatic row-level security and deployment automatically, with continuous validation at every step. Stakeholders self-serve in plain English; nothing waits in a developer queue.",
    ],
    points: [
      ["<4 hours end-to-end", " — was 3–5 business days"],
      ["<3 hours human effort", " — was ~28 hours across five roles"],
      ["Single review cycle", " — accurate and well-structured from the start"],
      ["Security on every deploy", " — per-role, audited, consistent"],
    ],
    metrics: [
      { to: 90, suffix: "%+", k: "faster turnaround" },
      { to: 85, suffix: "%+", k: "less human effort — 28 hours to under 3" },
      { to: 100, suffix: "%", k: "auditable security" },
      { v: "0", k: "queue wait" },
    ],
    tools: [
      ["Claude Code", "AI engineering engine that builds the solution end-to-end"],
      ["Power BI MCP", "bridge that lets AI create DAX, models and security safely"],
      ["Power BI", "where the live dashboard is delivered"],
      ["Source systems", "the business data the dashboard is built from"],
      ["RLS", "row-level security — each role sees only its own data"],
    ],
    flow: {
      nodes: [
        { id: "r", t: "Plain-English request", s: "no ticket · no spec", ab: "NL", col: 0 },
        { id: "cc", t: "Claude Code + MCP", s: "AI engineering engine", ico: "claude.svg", col: 1 },
        { id: "dax", t: "Model + DAX", s: "generated & tested", ico: "powerbi.svg", col: 2, row: 0 },
        { id: "rls", t: "Row-level security", s: "programmatic · per role", ab: "RLS", col: 2, row: 1 },
        { id: "v", t: "Validation", s: "continuous, every step", ab: "✓", col: 3 },
        { id: "d", t: "Live dashboard", s: "auto-scheduled refresh", ico: "powerbi.svg", col: 4 },
      ],
      edges: [
        { from: "r", to: "cc" },
        { from: "cc", to: "dax" },
        { from: "cc", to: "rls" },
        { from: "dax", to: "v" },
        { from: "rls", to: "v" },
        { from: "v", to: "d" },
      ],
    },
  },

  {
    id: "alerting",
    num: "03",
    type: "ML Pipeline",
    title: "AI-Based Alerting Automation",
    tagline: "Rules find the fraud, AI writes the report — and the alert lands in your inbox",
    card: {
      line: "Fraud conditions scan the full dataset; every detection becomes an AI-written report and an alert mail, automatically.",
      metric: "detection → inbox",
    },
    intro: [
      "Analysts were manually searching high-volume transaction datasets for suspicious activity — combing through millions of rows, dataset by dataset, waiting days per request and unable to scale without adding people. And after finding something, the work wasn't done: someone still had to write it up and notify the right people.",
      "The replacement automates the whole chain. The system scans the full dataset and applies the firm's fraud conditions — the rules that define exactly what suspicious looks like. Every detection is handed to AI, which generates a clear case report: what was flagged, the amounts, the pattern, why it matters. Then the AI drafts the alert mail and sends it to the right people. From raw data to a finished report in someone's inbox — automatically, every time.",
    ],
    points: [
      ["The full dataset, every time", " — every transaction is tested against the fraud conditions, not a sample"],
      ["AI-written case reports", " — each detection explained clearly: what, how much, why it was flagged"],
      ["Alerts send themselves", " — the AI drafts the mail and it goes straight to the right people"],
      ["Analysts start at review", " — the finding, the report and the notification are already done"],
    ],
    metrics: [
      { to: 90, suffix: "%", k: "faster than manual review" },
      { to: 100, suffix: "%", k: "of the dataset scanned" },
      { v: "auto", k: "report + alert mail, no human in the middle" },
      { v: "min", k: "from detection to inbox" },
    ],
    tools: [
      ["Transaction data", "the datasets being screened — millions of rows in MySQL"],
      ["Python", "scans every row and applies the fraud conditions"],
      ["Fraud conditions", "the firm's rules for exactly what suspicious looks like"],
      ["AI report writer", "turns each detection into a clear, readable case report"],
      ["AI mail alerts", "drafts the notification and sends it to the right people"],
    ],
    flow: {
      nodes: [
        { id: "d", t: "Transaction data", s: "millions of rows", ico: "mysql.svg", col: 0 },
        { id: "c", t: "Fraud conditions", s: "rules applied to every row", ab: "IF", col: 1 },
        { id: "f", t: "Fraud detected", s: "flagged cases only", ab: "!", col: 2 },
        { id: "ai", t: "AI", s: "understands the case", ico: "aiml.svg", col: 3 },
        { id: "rp", t: "Case report", s: "what · how much · why", ab: "DOC", col: 4, row: 0 },
        { id: "ml", t: "Alert mail", s: "drafted & sent by AI", ab: "@", col: 4, row: 1 },
      ],
      edges: [
        { from: "d", to: "c" },
        { from: "c", to: "f" },
        { from: "f", to: "ai" },
        { from: "ai", to: "rp" },
        { from: "ai", to: "ml" },
      ],
    },
  },

  {
    id: "engageai",
    num: "04",
    type: "AI Reporting",
    title: "EngageAI — Client Activity Reporting",
    tagline: "Sent mail, calls & meetings become an automated weekly client report",
    card: {
      line: "Sent mail, calls and meetings become a polished, classified weekly client report.",
      metric: "<3h weekly",
    },
    intro: [
      "Client-facing teams were burning days reconstructing “what did we do this week?” from inboxes, call logs and calendars.",
      "EngageAI ingests Outlook sent mail, Teams call logs and calendar meetings through Power Automate; AI generates “work performed” summaries; every item is classified by date, recipient, task type and billable status; and a polished weekly report ships automatically.",
    ],
    points: [
      ["<3 hours", " — reporting down from days of manual gathering"],
      ["Billable vs non-billable", " — classified automatically"],
      ["Call & meeting analytics", " — duration, date, core details"],
      ["Client-ready", " — weekly visibility without lifting a finger"],
    ],
    metrics: [
      { v: "<3h", k: "weekly reporting — down from days" },
      { v: "100%", k: "billability classified" },
      { v: "3", k: "feeds combined — mail, calls, meetings" },
      { v: "auto", k: "report ships itself every week" },
    ],
    tools: [
      ["Outlook", "sent-mail feed — what was communicated, to whom"],
      ["Teams", "call logs with duration, date and core call info"],
      ["Calendar", "scheduled meeting details and durations"],
      ["Power Automate", "collects all three feeds into one flow"],
      ["AI summarization", "writes the “work performed” narrative"],
      ["Classifier", "labels each item by task type and billable status"],
    ],
    flow: {
      nodes: [
        { id: "o", t: "Outlook", s: "sent mail", ab: "OL", col: 0, row: 0 },
        { id: "tm", t: "Teams", s: "call logs", ab: "TS", col: 0, row: 1 },
        { id: "cal", t: "Calendar", s: "meetings", ab: "CAL", col: 0, row: 2 },
        { id: "pa", t: "Power Automate", s: "one integration flow", ico: "powerautomate.svg", col: 1 },
        { id: "ai", t: "AI summarization", s: "“work performed” narrative", ico: "aiml.svg", col: 2 },
        { id: "cl", t: "Classification", s: "task type · billability", ab: "CLF", col: 3 },
        { id: "rp", t: "Weekly report", s: "automated delivery", ab: "RPT", col: 4 },
      ],
      edges: [
        { from: "o", to: "pa" },
        { from: "tm", to: "pa" },
        { from: "cal", to: "pa" },
        { from: "pa", to: "ai" },
        { from: "ai", to: "cl" },
        { from: "cl", to: "rp" },
      ],
    },
  },

  {
    id: "modernization",
    num: "05",
    type: "Reporting Modernization",
    title: "Centralized Power BI Reporting",
    tagline: "SQL Server and Excel data, combined into Power BI reports everyone can rely on",
    card: {
      line: "Data from SQL Server and Excel, combined into one Power BI model — every report from one place.",
      metric: "2 sources → 1 model",
    },
    intro: [
      "The firm's reporting ran on two kinds of data: core business data sitting in SQL Server, and the working numbers teams maintained in Excel workbooks. Building a report meant pulling from both by hand — exporting, copying, pasting, re-checking — every single cycle. Numbers drifted between versions, the same figure showed up differently in different meetings, and hours disappeared into refreshing reports that should have refreshed themselves.",
      "Over a five-month engagement we connected both sources directly into Power BI. SQL Server data and the Excel workbooks now feed one combined, cleaned data model — and every report and dashboard is built on top of that single model. Reports refresh themselves on schedule, access control is built in so each person sees only what they should, and teams self-serve instead of waiting. No more copy-paste. One version of every number.",
    ],
    points: [
      ["Two sources, one model", " — SQL Server and Excel data combined in Power BI"],
      ["No more copy-paste", " — reports refresh themselves on schedule"],
      ["One version of the truth", " — every report reads from the same model"],
      ["Access control built in", " — each person sees only what they should"],
    ],
    metrics: [
      { v: "2 → 1", k: "data sources into one model" },
      { v: "0", k: "copy-paste refreshes" },
      { to: 100, suffix: "%", k: "reports on the central model" },
      { v: "auto", k: "scheduled refresh, access control built in" },
    ],
    tools: [
      ["SQL Server", "the database holding the core business data"],
      ["Excel", "team workbooks — the second data source"],
      ["Power Query", "pulls and cleans both sources into one model"],
      ["Power BI", "where every report and dashboard is built and shared"],
      ["Access control", "each person sees only the data they're allowed to"],
    ],
    flow: {
      nodes: [
        { id: "sq", t: "SQL Server", s: "core business data", ico: "sql.svg", col: 0, row: 0 },
        { id: "xl", t: "Excel workbooks", s: "team inputs & working files", ico: "excel.svg", col: 0, row: 1 },
        { id: "md", t: "One data model", s: "combined & cleaned · access control", ab: "1", col: 1 },
        { id: "pb", t: "Power BI", s: "reports & dashboards", ico: "powerbi.svg", col: 2 },
        { id: "sv", t: "Always current", s: "auto-refresh · teams self-serve", ab: "✓", col: 3 },
      ],
      edges: [
        { from: "sq", to: "md" },
        { from: "xl", to: "md" },
        { from: "md", to: "pb" },
        { from: "pb", to: "sv" },
      ],
    },
  },
  {
    id: "coworker",
    num: "06",
    type: "Agentic AI",
    title: "AI Documentation Coworker",
    tagline: "A skill-based AI agent that writes and maintains report documentation, straight into Confluence",
    card: {
      line: "Gathers requirements in plain language, picks the right skill, and documents reports in Confluence via MCP.",
      metric: "hours → minutes",
    },
    intro: [
      "Documentation is the work everyone agrees matters — and no one has time for. Every new report needs a documentation page: purpose, data sources, logic, measures, owners. Every change to an existing report means finding the old page and updating it. Done by hand in Confluence, it consumed hours per report, pulled analysts away from real work, and drifted out of date almost immediately.",
      "We built an AI documentation coworker with a skill-based design. It starts by gathering the details from the user in plain language — which report, what it does, what changed. Then it selects the right skill for the requirement: a new-report skill that carries the firm's documentation template and standards and produces a complete, consistently structured page, or an update skill that locates the existing documentation in Confluence and revises exactly the sections that changed. The agent is connected to Confluence through MCP, so it reads and writes pages directly — no copy-paste, no formatting fixes, and every page follows the same standard.",
    ],
    points: [
      ["Hours become minutes", " — documentation happens while it's fresh, not “later”"],
      ["The right skill, automatically", " — the agent chooses create vs. update from the requirement"],
      ["One standard everywhere", " — the template lives inside the skill, so every page matches"],
      ["Direct to Confluence", " — the MCP connection reads and writes pages, zero copy-paste"],
    ],
    metrics: [
      { v: "hrs → min", k: "per documentation page" },
      { to: 100, suffix: "%", k: "template-consistent pages" },
      { v: "2", k: "skills — create & update" },
      { v: "0", k: "copy-paste steps" },
    ],
    tools: [
      ["AI Coworker", "the agent that gathers input and does the documenting"],
      ["Skills", "reusable playbooks — one for new documentation, one for updates"],
      ["Templates", "the firm's documentation standard, built into the skill"],
      ["Confluence", "where every report's documentation lives"],
      ["MCP", "the secure bridge that lets the agent read & write Confluence"],
    ],
    flow: {
      nodes: [
        { id: "q", t: "User input", s: "plain language · report details", ab: "Q", col: 0 },
        { id: "cw", t: "AI Coworker", s: "understands the requirement", ico: "coworker.svg", col: 1 },
        { id: "sk1", t: "Skill: New report doc", s: "template & standards built in", ab: "NEW", col: 2, row: 0 },
        { id: "sk2", t: "Skill: Update existing doc", s: "finds & revises the sections", ab: "UPD", col: 2, row: 1 },
        { id: "mcp", t: "MCP connection", s: "secure read & write bridge", ico: "mcp.svg", col: 3 },
        { id: "cf", t: "Confluence", s: "documentation published & current", ico: "confluence.svg", col: 4 },
      ],
      edges: [
        { from: "q", to: "cw" },
        { from: "cw", to: "sk1", label: "new report" },
        { from: "cw", to: "sk2", label: "existing report" },
        { from: "sk1", to: "mcp" },
        { from: "sk2", to: "mcp" },
        { from: "mcp", to: "cf" },
      ],
    },
  },
];

