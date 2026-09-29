/* Thumbnail of a case study's system flow, drawn from its own flow data:
   nodes as ledger diamonds on the same col/row grid Flow.jsx uses
   (unrowed nodes centre vertically), forward edges as curves, loop-backs
   as a return lane under the row. The last column — the payoff — is
   gold. Pure SVG, nothing measured; pathLength="1" lets the CSS draw
   every edge with the same dash maths. It draws in when its exhibit
   gets [data-in], and data runs along it on hover and focus. */
export default function FlowGlyph({ flow, w = 208, h = 60 }) {
  const { nodes, edges } = flow;
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row ?? 0)) + 1;
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const hasBack = edges.some((e) => by[e.to].col <= by[e.from].col);
  const P = 6;
  const top = P;
  const bot = hasBack ? h - 14 : h - P;
  const lane = h - 3;
  const last = cols - 1;
  const X = (n) => P + (n.col * (w - 2 * P)) / Math.max(cols - 1, 1);
  const Y = (n) => (n.row == null || rows === 1 ? (top + bot) / 2 : top + ((n.row + 0.5) * (bot - top)) / rows);
  const d = (a, b) => {
    const x1 = X(a);
    const y1 = Y(a);
    const x2 = X(b);
    const y2 = Y(b);
    if (b.col > a.col) {
      const mx = (x1 + x2) / 2;
      return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
    }
    return `M${x1} ${y1}Q${x1} ${lane} ${x1 - 8} ${lane}L${x2 + 8} ${lane}Q${x2} ${lane} ${x2} ${y2}`;
  };

  return (
    <svg className="glyph" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {edges.map((e) => {
        const a = by[e.from];
        const path = d(a, by[e.to]);
        return (
          <g key={`${e.from}-${e.to}`} style={{ "--c": a.col }}>
            <path className="g-edge" d={path} pathLength="1" />
            <path className="g-run" d={path} pathLength="1" />
          </g>
        );
      })}
      {nodes.map((n) => (
        <rect
          key={n.id}
          className={`g-node${n.col === last ? " end" : ""}`}
          style={{ "--c": n.col }}
          x={X(n) - 3.5}
          y={Y(n) - 3.5}
          width="7"
          height="7"
          transform={`rotate(45 ${X(n)} ${Y(n)})`}
        />
      ))}
    </svg>
  );
}
