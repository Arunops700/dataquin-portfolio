/*
  Single source of truth for the six case studies. Written for senior
  readers who skim: each study is a plain name, a one-line summary, the
  problem, our solution and its system flow — nothing more.
  Client-side product names are deliberately generic ("accounting
  system", "audit platform") — prospects won't know niche vendor tools,
  and client environments stay anonymous. Widely-known tools (Power BI,
  Excel, Outlook, Teams, Confluence) are fine to name.
*/
export const STUDIES = [
  {
    id: "integration",
    num: "01",
    title: "Automatic Data Sync Between Two Systems",
    summary: "Project figures now flow from the finance system into the audit system on their own — no re-typing.",
    problem: "Project figures lived in the accounting system, but the audit team worked in a separate system. Staff copied the numbers across by hand — slow, repetitive and prone to mistakes.",
    solution: "We built an automatic link between the two systems. It reads the figures, matches each project and updates the audit system by itself — no manual entry at all.",
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
    title: "Dashboards Built by AI in Hours",
    summary: "A request in plain English becomes a secure, ready-to-use dashboard in under four hours.",
    problem: "Every new dashboard passed through five people and took three to five working days, with several review rounds and security set up by hand.",
    solution: "We built an AI engine that builds the dashboard, its calculations and its access rules automatically, checking its own work at every step. Ready in under four hours.",
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
    title: "Automatic Fraud Alerts",
    summary: "Suspicious transactions are found, written up and reported to the right people — automatically.",
    problem: "Analysts searched millions of transactions by hand for suspicious activity, then still had to write up each case and alert the right people. Each request took days.",
    solution: "The system checks every transaction against the firm's fraud rules. For each case it finds, AI writes a clear report and emails the alert to the right people.",
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
    title: "Automatic Weekly Client Activity Reports",
    summary: "Emails, calls and meetings turn into a finished weekly client report, with no manual work.",
    problem: "Client teams spent days every week piecing together what they had done from inboxes, call logs and calendars.",
    solution: "We connected Outlook, Teams and the calendar. AI summarises the week's work, sorts each item by task and whether it is billable, and sends the report automatically.",
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
    title: "All Reports from One Central Source",
    summary: "Database and Excel data combined into one set of Power BI reports — one version of every number.",
    problem: "Reports were rebuilt every cycle by copying data from the database and Excel by hand. Numbers drifted, and the same figure differed from meeting to meeting.",
    solution: "We connected both sources into one Power BI data model. Every report now refreshes itself, each person sees only what they should, and everyone works from the same numbers.",
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
    title: "AI Assistant That Writes Documentation",
    summary: "An AI assistant writes and updates report documentation in Confluence in minutes.",
    problem: "Every report needs a documentation page, and every change means updating it. Done by hand, it took hours per report and quickly went out of date.",
    solution: "We built an AI assistant that asks a few plain-language questions, then writes a new page or updates the existing one directly in Confluence — always in the firm's standard format.",
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

