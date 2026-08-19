import { useLayoutEffect, useRef, useState, useId } from "react";

/*
  Custom animated flow diagram (replaces mermaid).

  Nodes are laid out on a CSS grid (col/row per node; nodes without a row
  vertically span all rows and self-center). After mount we measure the real
  DOM positions and draw an SVG layer underneath with curved connectors,
  arrowheads and glowing pulses that travel each edge via SMIL animateMotion.

  Node spec:  { id, t, s, ico?, ab?, col, row? }
  Edge spec:  { from, to, label? }   (backward edges loop under the diagram)
*/
export default function Flow({ nodes, edges }) {
  const wrapRef = useRef(null);
  const nodeRefs = useRef({});
  const [paths, setPaths] = useState([]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // SMIL animation can't be disabled from CSS, so reduced-motion has to be
  // honoured here by not rendering the travelling pulses at all.
  const still =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row ?? 0)) + 1;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const hasBack = edges.some((e) => byId[e.to] && byId[e.from] && byId[e.to].col <= byId[e.from].col);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      if (!wr.width) return;
      const out = [];
      edges.forEach((e, i) => {
        const s = nodeRefs.current[e.from];
        const t = nodeRefs.current[e.to];
        const sN = byId[e.from];
        const tN = byId[e.to];
        if (!s || !t || !sN || !tN) return;
        const sr = s.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        let d, lx, ly;
        if (tN.col > sN.col) {
          // forward: right edge → left edge, smooth S-curve
          const sx = sr.right - wr.left;
          const sy = sr.top + sr.height / 2 - wr.top;
          const tx = tr.left - wr.left - 5;
          const ty = tr.top + tr.height / 2 - wr.top;
          const mx = (sx + tx) / 2;
          d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
          lx = (sx + tx) / 2;
          ly = (sy + ty) / 2 - 9;
        } else {
          // backward: loop under the diagram, bottom → bottom
          const sx = sr.left + sr.width / 2 - wr.left;
          const sy = sr.bottom - wr.top;
          const tx = tr.left + tr.width / 2 - wr.left;
          const ty = tr.bottom - wr.top + 5;
          const dip = Math.max(sy, ty) + 44;
          d = `M ${sx} ${sy} C ${sx} ${dip}, ${tx} ${dip}, ${tx} ${ty}`;
          lx = (sx + tx) / 2;
          ly = dip + 4;
        }
        out.push({ d, label: e.label, lx, ly, i });
      });
      setPaths(out);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    // Edges are drawn from measured DOM geometry. On a cold load that
    // measurement can happen while the fallback fonts are still in use; when
    // Fraunces/Jakarta swap in, node text reflows and the connectors would
    // otherwise stay pinned to the old positions.
    let alive = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (alive) measure(); });
    }

    return () => { alive = false; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  return (
    <div className="flow-scroll" tabIndex={0} role="group" aria-label="System flow diagram">
      <div
        className="flow"
        ref={wrapRef}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(182px, 1fr))`,
          minWidth: cols * 200 + (cols - 1) * 46,
          "--n": nodes.length,
          paddingBottom: hasBack ? 56 : 4,
        }}
      >
        <svg className="flow-svg" aria-hidden="true">
          <defs>
            <marker
              id={`arr-${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#8f7355" />
            </marker>
          </defs>
          {paths.map((p) => (
            <g key={p.i} className="fedge" style={{ animationDelay: `${0.3 + p.i * 0.12}s` }}>
              <path className="fedge-line" d={p.d} markerEnd={`url(#arr-${uid})`} />
              {!still && (
                <>
                  <circle className="fpulse-halo" r="6.5">
                    <animateMotion dur="2.6s" repeatCount="indefinite" path={p.d} begin={`${-p.i * 0.45}s`} />
                  </circle>
                  <circle className="fpulse" r="3.2">
                    <animateMotion dur="2.6s" repeatCount="indefinite" path={p.d} begin={`${-p.i * 0.45}s`} />
                  </circle>
                </>
              )}
              {p.label && (
                <text className="flow-lbl" x={p.lx} y={p.ly} textAnchor="middle">{p.label}</text>
              )}
            </g>
          ))}
        </svg>

        {nodes.map((n, i) => (
          <div
            key={n.id}
            ref={(el) => { nodeRefs.current[n.id] = el; }}
            className="fnode"
            style={{
              gridColumn: n.col + 1,
              gridRow: n.row != null ? n.row + 1 : `1 / ${rows + 1}`,
              "--i": i,
            }}
          >
            <span className={`fnode-ico${n.ico ? "" : " txt"}`}>
              {n.ico
                ? <img src={`/icons/${n.ico}`} alt="" loading="lazy" />
                : (n.ab || n.t.slice(0, 2).toUpperCase())}
            </span>
            <span className="fnode-body">
              <span className="ft">{n.t}</span>
              <span className="fs">{n.s}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
