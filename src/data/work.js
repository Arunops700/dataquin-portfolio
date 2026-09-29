/*
  Work-page content that is not a case study. A plain module (no browser
  APIs, no JSX) so scripts/route-heads.mjs can import it from Node.
*/
import { STUDIES } from "./caseStudies.js";
import { countWord, cap } from "./format.js";

/* One source for the /work description: Work.jsx (usePageMeta) and
   scripts/route-heads.mjs (the static preview head), so they never drift. */
export const WORK_DESCRIPTION = `${cap(countWord(STUDIES.length))} production systems built for professional services firms — cross-system integration, AI-accelerated BI delivery, fraud alerting, client activity reporting, centralized reporting and an AI documentation coworker. Anonymized, measured, still running.`;

/* The two journeys drawn to scale (figures from the CS·02 chapter).
   "<4 hours" is drawn as half of an 8-hour business day; the hatched
   part of the old turnaround is the uncertain end of "3–5 days". */
export const JOURNEY_SCALE = [
  {
    id: "effort",
    k: "Human effort",
    unit: "hours",
    max: 30,
    ticks: [0, 10, 20, 30],
    old: { to: 28, label: "~28 hrs" },
    now: { to: 3, label: "<3 hrs" },
  },
  {
    id: "turnaround",
    k: "Turnaround",
    unit: "business days",
    max: 5,
    ticks: [0, 1, 2, 3, 4, 5],
    old: { from: 3, to: 5, label: "3–5 days" },
    now: { to: 0.5, label: "<4 hours" },
  },
];

/* The journey totals, derived from the scale so the two can't disagree. */
const scale = Object.fromEntries(JOURNEY_SCALE.map((r) => [r.id, r]));
export const JOURNEY_TOTALS = {
  old: `${scale.turnaround.old.label} · ${scale.effort.old.label} effort`,
  now: `${scale.turnaround.now.label} · ${scale.effort.now.label} effort`,
};
