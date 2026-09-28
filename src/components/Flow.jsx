import { useLayoutEffect, useRef, useState, useId, useEffect, useCallback } from "react";
import { useMotionValue, useMotionValueEvent } from "framer-motion";

/*
  Scroll-scrubbed flow diagram.

  Nodes are laid out on a CSS grid (col/row per node; nodes without a row
  vertically span all rows and self-center). After mount we measure the real
  DOM positions and draw an SVG layer above with curved connectors.

  The reader drives the data through the pipeline: `progress` (a
  framer-motion MotionValue, 0 → 1) draws each edge in stage order, a gold
  pulse rides the tip of the line as it draws, the arrowhead lands when the
  line arrives, and the node it reaches lights up. Without a `progress`
  prop the diagram renders fully drawn and lit.

  Node spec:  { id, t, s, ico?, ab?, col, row? }
  Edge spec:  { from, to, label? }   (backward edges loop under the diagram)
*/
export default function Flow({ nodes, edges, progress }) {
  const wrapRef = useRef(null);
  const nodeRefs = useRef({});
  const edgeRefs = useRef([]);
  const [paths, setPaths] = useState([]);
  const [overflowing, setOverflowing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const fallback = useMotionValue(1);
  const prog = progress || fallback;

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

      const rects = {};
      nodes.forEach((n) => {
        const el = nodeRefs.current[n.id];
        if (el) rects[n.id] = el.getBoundingClientRect();
      });

      /* Fan-in / fan-out: when several forward edges share one side of a
         node, spread their attachment points across that side. */
      const fwd = edges.filter(
        (e) => byId[e.to] && byId[e.from] && rects[e.to] && rects[e.from] &&
               byId[e.to].col > byId[e.from].col
      );
      const outs = {};
      const ins = {};
      fwd.forEach((e) => {
        (outs[e.from] = outs[e.from] || []).push(e);
        (ins[e.to] = ins[e.to] || []).push(e);
      });
      const cy = (id) => rects[id].top + rects[id].height / 2;
      Object.values(outs).forEach((l) => l.sort((a, b) => cy(a.to) - cy(b.to)));
      Object.values(ins).forEach((l) => l.sort((a, b) => cy(a.from) - cy(b.from)));
      const slot = (list, e, r) =>
        r.top + (r.height * (list.indexOf(e) + 1)) / (list.length + 1);

      const out = [];
      edges.forEach((e, i) => {
        const sN = byId[e.from];
        const tN = byId[e.to];
        const sr = rects[e.from];
        const tr = rects[e.to];
        if (!sr || !tr || !sN || !tN) return;
        let d, lx, ly, anchor;
        if (tN.col > sN.col) {
          const sx = sr.right - wr.left;
          const sy = slot(outs[e.from], e, sr) - wr.top;
          const tx = tr.left - wr.left - 5;
          const ty = slot(ins[e.to], e, tr) - wr.top;
          const mx = (sx + tx) / 2;
          d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
          lx = tx - 10;
          ly = ty - 11;
          anchor = "end";
        } else {
          const sx = sr.left + sr.width / 2 - wr.left;
          const sy = sr.bottom - wr.top;
          const tx = tr.left + tr.width / 2 - wr.left;
          const ty = tr.bottom - wr.top + 5;
          const dip = Math.max(sy, ty) + 44;
          d = `M ${sx} ${sy} C ${sx} ${dip}, ${tx} ${dip}, ${tx} ${ty}`;
          lx = (sx + tx) / 2;
          ly = dip + 4;
          anchor = "middle";
        }
        // stage order: edges leaving earlier columns draw first
        out.push({ d, label: e.label, lx, ly, anchor, i, order: sN.col, to: e.to, from: e.from });
      });
      out.sort((a, b) => a.order - b.order || a.i - b.i);
      setPaths(out);

      const sc = scrollRef.current;
      if (sc) setOverflowing(sc.scrollWidth > sc.clientWidth + 4);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    let alive = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (alive) measure(); });
    }
    return () => { alive = false; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  /* Apply a progress value to the drawn SVG: dash-offset each line,
     park the pulse at its tip, land arrowheads, light reached nodes.
     All geometry reads happen before any style write, so a scroll
     frame costs one layout, not one per edge. */
  const apply = useCallback((v) => {
    const E = paths.length;
    if (!E) return;
    const span = E > 1 ? 0.5 : 1;
    const step = E > 1 ? (1 - span) / (E - 1) : 0;
    const lit = new Set();
    // first-column nodes light as soon as the story starts
    if (v > 0.02) nodes.forEach((n) => { if (n.col === 0) lit.add(n.id); });

    // reads
    const frames = paths.map((p, k) => {
      const r = edgeRefs.current[k];
      if (!r || !r.line) return null;
      const e = Math.min(1, Math.max(0, (v - k * step) / span));
      const len = r.len || (r.len = r.line.getTotalLength());
      const pt = r.pulse ? r.line.getPointAtLength(len * e) : null;
      return { r, e, len, pt, to: p.to };
    });
    // writes
    frames.forEach((f) => {
      if (!f) return;
      const { r, e, len, pt } = f;
      const off = len * (1 - e);
      r.line.style.strokeDasharray = `${len}`;
      r.line.style.strokeDashoffset = `${off}`;
      r.halo.style.strokeDasharray = `${len}`;
      r.halo.style.strokeDashoffset = `${off}`;
      if (r.pulse && pt) {
        r.pulse.setAttribute("cx", pt.x);
        r.pulse.setAttribute("cy", pt.y);
        r.pulseHalo.setAttribute("cx", pt.x);
        r.pulseHalo.setAttribute("cy", pt.y);
        const vis = e > 0.01 && e < 0.995 ? 1 : 0;
        r.pulse.style.opacity = vis;
        r.pulseHalo.style.opacity = vis;
      }
      r.line.setAttribute("marker-end", e > 0.96 ? `url(#arr-${uid})` : "");
      if (r.lbl) r.lbl.classList.toggle("on", e > 0.85);
      if (e > 0.97) lit.add(f.to);
    });

    nodes.forEach((n) => {
      const el = nodeRefs.current[n.id];
      if (el) el.classList.toggle("lit", lit.has(n.id));
    });
  }, [paths, nodes, uid]);

  useMotionValueEvent(prog, "change", apply);
  useEffect(() => { apply(prog.get()); }, [apply, prog]);

  return (
    <div className="flow-shell">
    {/* The edges are drawn, not written: this is the diagram in words. */}
    <p className="sr-only">
      System flow: {edges.map((e) => `${byId[e.from]?.t} to ${byId[e.to]?.t}${e.label ? ` (${e.label})` : ""}`).join("; ")}.
    </p>
    <div
      className={`flow-scroll${overflowing ? " is-scrollable" : ""}${scrolled ? " is-scrolled" : ""}`}
      ref={scrollRef}
      /* keyboard-scrollable only when there is something to scroll */
      tabIndex={overflowing ? 0 : undefined}
      role={overflowing ? "group" : undefined}
      aria-label={overflowing ? "System flow diagram — scrolls horizontally" : undefined}
      onScroll={() => { if (!scrolled) setScrolled(true); }}
    >
      <div
        className="flow-stages"
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(182px, 1fr))`,
          minWidth: cols * 192 + (cols - 1) * 40,
        }}
      >
        {Array.from({ length: cols }, (_, c) => (
          <span key={c}>Stage {String(c + 1).padStart(2, "0")}</span>
        ))}
      </div>
      <div
        className="flow"
        ref={wrapRef}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(182px, 1fr))`,
          minWidth: cols * 192 + (cols - 1) * 40,
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
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#d8bc8a" />
            </marker>
          </defs>
          {paths.map((p, k) => (
            <g key={p.i} className="fedge">
              <path className="fedge-halo" d={p.d}
                ref={(el) => { (edgeRefs.current[k] = edgeRefs.current[k] || {}).halo = el; }} />
              <path className="fedge-line" d={p.d}
                ref={(el) => { const r = (edgeRefs.current[k] = edgeRefs.current[k] || {}); r.line = el; r.len = 0; }} />
              <circle className="fpulse-halo" r="6.5" style={{ opacity: 0 }}
                ref={(el) => { (edgeRefs.current[k] = edgeRefs.current[k] || {}).pulseHalo = el; }} />
              <circle className="fpulse" r="3.2" style={{ opacity: 0 }}
                ref={(el) => { (edgeRefs.current[k] = edgeRefs.current[k] || {}).pulse = el; }} />
              {p.label && (
                <text className="flow-lbl" x={p.lx} y={p.ly} textAnchor={p.anchor}
                  ref={(el) => { (edgeRefs.current[k] = edgeRefs.current[k] || {}).lbl = el; }}>
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {nodes.map((n, i) => (
          <div
            key={n.id}
            ref={(el) => { nodeRefs.current[n.id] = el; }}
            className={`fnode${n.col === cols - 1 ? " end" : ""}`}
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
      {overflowing && (
        <div className="flow-hint" aria-hidden="true">
          <span>Swipe to follow the flow</span>
          <span className="flow-hint-arr">→</span>
        </div>
      )}
    </div>
  );
}
