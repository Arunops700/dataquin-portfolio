import { CountUp } from "../fx.jsx";

/* The ledger correction. In chapter metrics and IMPACTS an arrow means
   before → after (see caseStudies.js), so "2 → 1" is printed the way a
   ledger corrects an entry: the old figure small and struck through in
   gold, the new one full size. Screen readers get the original string. */

export function figParts(m) {
  if (m.to != null) return null;
  const p = String(m.v).split("→");
  return p.length === 2 ? p.map((s) => s.trim()) : null;
}

/* Rendered length in rough character widths; drives the auto-fit of the
   big figures (font-size is capped by the cell's own width in CSS). */
export function figLen(m) {
  if (m.to != null) return `${m.to}${m.suffix || ""}`.length;
  const p = figParts(m);
  return p ? p[1].length + (p[0].length + 1) * 0.46 : String(m.v).length;
}

/* Place inside a Reveal: the strike draws once the Reveal is in. */
export function LedgerFigure({ m }) {
  if (m.to != null) return <CountUp to={m.to} suffix={m.suffix || ""} />;
  const p = figParts(m);
  if (!p) return m.v;
  return (
    <>
      <span aria-hidden="true">
        <span className="fig-was">{p[0]}</span>
        <span className="fig-arr">→</span>
        <span className="fig-now">{p[1]}</span>
      </span>
      <span className="sr-only">{p[0]} to {p[1]}</span>
    </>
  );
}
