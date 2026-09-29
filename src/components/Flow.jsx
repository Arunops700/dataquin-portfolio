import { Fragment, useId, useLayoutEffect, useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent } from "framer-motion";
import { pad2 } from "../data/format.js";

/*
  Scroll-drawn flow diagram, in one of two layouts picked by a measured
  fit test rather than a breakpoint:

  - across: nodes on a CSS grid (col/row per node; nodes without a row
    span every row and self-center), curved SVG connectors, a stage rail
    on top. Used whenever all the stages fit side by side.
  - down, the "stage ledger": stages stacked top to bottom on one gilt
    spine with a tick into each node, loops routed up a right-hand
    gutter. Used wherever the stages would not fit (phones, tablets,
    narrow laptops), so the diagram never scrolls sideways and the
    reader sees it draw.

  `progress` (a MotionValue, 0 → 1) drives the draw: lines grow stage by
  stage, a pulse rides each tip, arrowheads land, reached nodes light.
  Without it the diagram renders fully drawn. Geometry is measured in
  layout space (offsets, not bounding rects), so a CSS tilt on an
  ancestor never bends the connectors.

  Node spec:  { id, t, s, ico?, ab?, col, row? }
  Edge spec:  { from, to, label? }   (backward edges loop back)
*/

const MIN_COL = 182; // flow.css: minmax(182px, 1fr)
const GUT = 32;      // flow.css: --gut
const SPINE_X = 11;  // the ledger spine; flow.css pads nodes to 34px
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* A box relative to .flow (every node's offsetParent). */
function box(el) {
  const left = el.offsetLeft;
  const top = el.offsetTop;
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  return { left, top, width, height, right: left + width, bottom: top + height,
    cx: left + width / 2, cy: top + height / 2 };
}

const isBack = (byId, e) => byId[e.to].col <= byId[e.from].col;

function acrossGeometry(edges, byId, rects, cols) {
  /* Fan-in / fan-out: several forward edges on one side of a node
     spread their attachment points across that side. */
  const outs = {};
  const ins = {};
  edges.forEach((e) => {
    if (!rects[e.from] || !rects[e.to] || isBack(byId, e)) return;
    (outs[e.from] = outs[e.from] || []).push(e);
    (ins[e.to] = ins[e.to] || []).push(e);
  });
  Object.values(outs).forEach((l) => l.sort((a, b) => rects[a.to].cy - rects[b.to].cy));
  Object.values(ins).forEach((l) => l.sort((a, b) => rects[a.from].cy - rects[b.from].cy));
  const slot = (list, e, r) => r.top + (r.height * (list.indexOf(e) + 1)) / (list.length + 1);

  const paths = [];
  edges.forEach((e, i) => {
    const sr = rects[e.from];
    const tr = rects[e.to];
    if (!sr || !tr) return;
    if (!isBack(byId, e)) {
      const sx = sr.right;
      const sy = slot(outs[e.from], e, sr);
      const tx = tr.left - 5;
      const ty = slot(ins[e.to], e, tr);
      const mx = (sx + tx) / 2;
      // grouped by the stage it arrives at: a fan-in lands together
      paths.push({ i, to: e.to, order: byId[e.to].col,
        d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}` });
    } else {
      // a loop back dips under the diagram; its label sits under the dip
      const sx = sr.cx;
      const sy = sr.bottom;
      const tx = tr.cx;
      const ty = tr.bottom + 5;
      const dip = Math.max(sy, ty) + 44;
      paths.push({ i, to: e.to, order: cols + 1, label: e.label, lx: (sx + tx) / 2, ly: dip + 4,
        d: `M ${sx} ${sy} C ${sx} ${dip}, ${tx} ${dip}, ${tx} ${ty}` });
    }
  });
  const orders = [...new Set(paths.map((p) => p.order))].sort((a, b) => a - b);
  paths.forEach((p) => { p.slot = orders.indexOf(p.order); });
  return { mode: "across", paths, slots: orders.length };
}

function downGeometry(edges, byId, rects, stageRects, order) {
  const last = rects[order[order.length - 1].id];
  const y0 = stageRects[0].cy;
  const y1 = last.cy;
  const ticks = order.map((n) => {
    const r = rects[n.id];
    return { id: n.id, y: r.cy, d: `M ${SPINE_X} ${r.cy} H ${r.left - 4}` };
  });
  // loops climb a gutter just right of the widest node, with soft corners;
  // 20px out leaves the arrowhead (~9px) a straight run into the target,
  // clear of the corner, inside .flow.is-v.has-back's 26px padding
  const gx = Math.max(...Object.values(rects).map((r) => r.right)) + 20;
  const c = 6;
  const paths = [];
  edges.forEach((e, i) => {
    const sr = rects[e.from];
    const tr = rects[e.to];
    if (!sr || !tr || !isBack(byId, e)) return;
    const sy = sr.cy;
    const ty = tr.cy;
    const dir = ty < sy ? -1 : 1;
    paths.push({ i, to: e.to,
      d: `M ${sr.right} ${sy} H ${gx - c} Q ${gx} ${sy} ${gx} ${sy + dir * c} ` +
         `V ${ty - dir * c} Q ${gx} ${ty} ${gx - c} ${ty} H ${tr.right + 5}` });
  });
  return { mode: "down", paths, ticks, stages: stageRects.map((r) => r.cy),
    spine: { d: `M ${SPINE_X} ${y0} V ${y1}`, y0, y1 } };
}

/* Dash-draw one connector to `e` (0–1), park its pulse at `pt`, land the
   arrowhead, show its label. Every write happens only on a change. */
function paintEdge(r, e, pt, marker) {
  if (!r.line) return;
  if (e !== r.e) {
    r.e = e;
    const off = String(r.len * (1 - e));
    r.line.style.strokeDashoffset = off;
    if (r.halo) r.halo.style.strokeDashoffset = off;
  }
  if (r.pulse) {
    if (pt) {
      r.pulse.setAttribute("cx", pt.x);
      r.pulse.setAttribute("cy", pt.y);
      r.pulseHalo.setAttribute("cx", pt.x);
      r.pulseHalo.setAttribute("cy", pt.y);
    }
    const vis = pt ? "1" : "0";
    if (vis !== r.pv) {
      r.pv = vis;
      r.pulse.style.opacity = vis;
      r.pulseHalo.style.opacity = vis;
    }
  }
  if (marker !== undefined) {
    const arrow = e > 0.96;
    if (arrow !== r.arrow) {
      r.arrow = arrow;
      if (arrow) r.line.setAttribute("marker-end", marker);
      else r.line.removeAttribute("marker-end");
    }
  }
  if (r.lbl) toggle(r, "on", r.lbl, "data-on", e > 0.85);
}

/* Cached attribute toggle: `flag` on cache `c` mirrors `attr` on `el`. */
function toggle(c, flag, el, attr, on) {
  if (!el || c[flag] === on) return;
  c[flag] = on;
  if (on) el.setAttribute(attr, "");
  else el.removeAttribute(attr);
}

function syncLit(els, next, prev) {
  prev.forEach((id) => { if (!next.has(id)) els[id]?.removeAttribute("data-lit"); });
  next.forEach((id) => { if (!prev.has(id)) els[id]?.setAttribute("data-lit", ""); });
}

export default function Flow({ nodes, edges, progress, onMode }) {
  const shellRef = useRef(null);
  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const nodeEls = useRef({});
  const stageEls = useRef([]);
  const edgeEls = useRef({});   // by edge index: { line, halo, pulse, pulseHalo, lbl }
  const spineEls = useRef({});  // { line, halo, pulse, pulseHalo }
  const tickEls = useRef({});   // by node id
  const draw = useRef(null);    // per-geometry caches, rebuilt on every measure
  const geoKey = useRef("");
  const [geo, setGeo] = useState(null);
  const [overflowing, setOverflowing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const fallback = useMotionValue(1);
  const prog = progress || fallback;

  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row ?? 0)) + 1;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const known = edges.filter((e) => byId[e.from] && byId[e.to]);
  const hasBack = known.some((e) => isBack(byId, e));
  const order = [...nodes].sort((a, b) => a.col - b.col || (a.row ?? 0) - (b.row ?? 0));

  /* Fit test: across only when every stage gets its minimum column. The
     shell's width never depends on the mode, so this cannot oscillate;
     it runs before paint, so the wrong layout never flashes. */
  const need = cols * MIN_COL + (cols - 1) * GUT;
  const [vertical, setVertical] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1180
  );
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const check = () => {
      const w = el.clientWidth;
      if (!w) return;
      const v = w < need + 4;
      setVertical((o) => (o === v ? o : v));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [need]);
  useLayoutEffect(() => { onMode?.(vertical); }, [vertical, onMode]);

  /* Measure the laid-out nodes and build the SVG geometry. */
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      if (!wrap.clientWidth) return;
      const rects = {};
      nodes.forEach((n) => {
        const el = nodeEls.current[n.id];
        if (el) rects[n.id] = box(el);
      });
      let g;
      if (vertical) {
        const stageRects = [];
        for (let c = 0; c < cols; c++) {
          const el = stageEls.current[c];
          if (!el) return;
          stageRects.push(box(el));
        }
        if (order.some((n) => !rects[n.id])) return;
        g = downGeometry(known, byId, rects, stageRects, order);
      } else {
        g = acrossGeometry(known, byId, rects, cols);
      }
      // a resize that moved nothing (the observer's first call) is free
      const key = JSON.stringify(g);
      if (key !== geoKey.current) {
        geoKey.current = key;
        setGeo(g);
      }
      const sc = scrollRef.current;
      setOverflowing(!vertical && !!sc && sc.scrollWidth > sc.clientWidth + 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    let alive = true;
    document.fonts?.ready?.then(() => { if (alive) measure(); });
    return () => { alive = false; ro.disconnect(); };
    // nodes/edges are stable study data; byId, known and order derive from them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, vertical, cols]);

  const shown = geo && (geo.mode === "down") === vertical ? geo : null;
  const marker = `url(#arr-${uid})`;

  /* Apply a progress value. Reads (path points) happen before writes, so
     a scroll frame costs one layout at most; every write is cached. */
  const apply = (v) => {
    const st = draw.current;
    if (!st) return;
    const lit = new Set();
    if (st.mode === "across") {
      if (v > 0.02) nodes.forEach((n) => { if (n.col === 0) lit.add(n.id); });
      const slice = 1 / st.slots;
      const frames = st.recs.map((r) => {
        // an 8% dwell per stage: arrowheads land before the next stage starts
        const e = clamp01((v - r.slot * slice) / (slice * 0.92));
        const pt = r.line && e > 0.01 && e < 0.995 ? r.line.getPointAtLength(r.len * e) : null;
        return { e, pt };
      });
      st.recs.forEach((r, k) => {
        const { e, pt } = frames[k];
        paintEdge(r, e, pt, marker);
        if (e > 0.97) lit.add(r.to);
      });
    } else {
      const sp = st.spine;
      const e = clamp01(v / (st.recs.length ? 0.9 : 1));
      const tip = sp.y0 + e * (sp.y1 - sp.y0);
      const eb = clamp01((v - 0.9) / 0.1);
      const frames = st.recs.map((r) =>
        r.line && eb > 0.01 && eb < 0.995 ? r.line.getPointAtLength(r.len * eb) : null);
      paintEdge(sp, e, e > 0.01 && e < 0.995 ? { x: SPINE_X, y: tip } : null);
      const on = v > 0.02;
      st.ticks.forEach((t) => {
        const reached = on && t.y <= tip + 1;
        if (reached) lit.add(t.id);
        toggle(t, "on", tickEls.current[t.id], "data-on", reached);
      });
      st.stages.forEach((s) => toggle(s, "on", stageEls.current[s.c], "data-lit", on && s.y <= tip + 1));
      st.recs.forEach((r, k) => {
        paintEdge(r, eb, frames[k], marker);
        if (eb > 0.97) lit.add(r.to);
      });
    }
    syncLit(nodeEls.current, lit, st.lit);
    st.lit = lit;
  };
  const applyRef = useRef(apply);
  applyRef.current = apply;

  /* New geometry: rebuild the caches, reset every lit state, redraw. */
  useLayoutEffect(() => {
    if (!shown) { draw.current = null; return; }
    const prep = (r) => {
      const len = r.line ? r.line.getTotalLength() : 0;
      if (r.line) r.line.style.strokeDasharray = `${len}`;
      if (r.halo) r.halo.style.strokeDasharray = `${len}`;
      return { ...r, len, e: -1, pv: "", arrow: null, on: null };
    };
    Object.values(nodeEls.current).forEach((el) => el?.removeAttribute("data-lit"));
    stageEls.current.forEach((el) => el?.removeAttribute("data-lit"));
    Object.values(tickEls.current).forEach((el) => el?.removeAttribute("data-on"));
    draw.current = {
      mode: shown.mode,
      slots: shown.slots,
      recs: shown.paths.map((p) => ({ ...prep(edgeEls.current[p.i] || {}), to: p.to, slot: p.slot })),
      spine: shown.spine ? { ...prep(spineEls.current), ...shown.spine } : null,
      ticks: (shown.ticks || []).map((t) => ({ ...t, on: null })),
      stages: (shown.stages || []).map((y, c) => ({ y, c, on: null })),
      lit: new Set(),
    };
    applyRef.current(prog.get());
  }, [shown, prog]);

  useMotionValueEvent(prog, "change", (v) => applyRef.current(v));

  /* Forward-edge labels read as a "via" line inside the node they reach;
     in the ledger every label does (loops included). */
  const via = {};
  known.forEach((e) => {
    if (e.label && (vertical || !isBack(byId, e))) via[e.to] = e.label;
  });

  const edgeRef = (i, part) => (el) => {
    (edgeEls.current[i] = edgeEls.current[i] || {})[part] = el;
  };
  const renderNode = (n) => (
    <div
      key={n.id}
      ref={(el) => { nodeEls.current[n.id] = el; }}
      className={`fnode${n.col === cols - 1 ? " end" : ""}`}
      style={vertical ? undefined : {
        gridColumn: n.col + 1,
        gridRow: n.row != null ? n.row + 1 : `1 / ${rows + 1}`,
      }}
    >
      <span className={`fnode-ico${n.ico ? "" : " txt"}`}>
        {n.ico
          ? <img src={`/icons/${n.ico}`} alt="" loading="lazy" />
          : (n.ab || n.t.slice(0, 2).toUpperCase())}
      </span>
      <span className="fnode-body">
        {via[n.id] && <span className="fvia">{via[n.id]}</span>}
        <span className="ft">{n.t}</span>
        <span className="fs">{n.s}</span>
      </span>
    </div>
  );

  const byCol = Array.from({ length: cols }, (_, c) => order.filter((n) => n.col === c));

  return (
    <div className="flow-shell" ref={shellRef}>
      {/* The edges are drawn, not written: this is the diagram in words.
          The drawing itself is hidden from assistive tech. */}
      <p className="sr-only">
        Components, in order: {order.map((n) => (n.s ? `${n.t} (${n.s})` : n.t)).join("; ")}.{" "}
        System flow: {known.map((e) => `${byId[e.from].t} to ${byId[e.to].t}${e.label ? ` (${e.label})` : ""}`).join("; ")}.
      </p>
      <div
        className={`flow-scroll${overflowing ? " is-scrollable" : ""}${scrolled ? " is-scrolled" : ""}`}
        ref={scrollRef}
        /* a safety net for zoomed text only: keyboard-scrollable when needed */
        tabIndex={overflowing ? 0 : undefined}
        role={overflowing ? "group" : undefined}
        aria-label={overflowing ? "System flow diagram — scrolls horizontally" : undefined}
        onScroll={overflowing && !scrolled ? () => setScrolled(true) : undefined}
      >
        {!vertical && (
          <div className="flow-stages" aria-hidden="true" style={{ "--cols": cols }}>
            {byCol.map((_, c) => <span key={c}>Stage {pad2(c + 1)}</span>)}
          </div>
        )}
        <div
          className={`flow${vertical ? " is-v" : ""}${vertical && hasBack ? " has-back" : ""}`}
          ref={wrapRef}
          aria-hidden="true"
          style={vertical ? undefined : { "--cols": cols, paddingBottom: hasBack ? 56 : 4 }}
        >
          <svg className="flow-svg">
            <defs>
              <marker id={`arr-${uid}`} viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path className="fmarker" d="M 0 1 L 9 5 L 0 9 z" />
              </marker>
            </defs>
            {shown?.spine && (
              <g>
                <path className="fedge-halo" d={shown.spine.d} ref={(el) => { spineEls.current.halo = el; }} />
                <path className="fedge-line" d={shown.spine.d} ref={(el) => { spineEls.current.line = el; }} />
                {shown.ticks.map((t) => (
                  <path key={t.id} className="ftick" d={t.d} ref={(el) => { tickEls.current[t.id] = el; }} />
                ))}
                <circle className="fpulse-halo" r="6.5" ref={(el) => { spineEls.current.pulseHalo = el; }} />
                <circle className="fpulse" r="3.2" ref={(el) => { spineEls.current.pulse = el; }} />
              </g>
            )}
            {shown?.paths.map((p) => (
              <g key={p.i}>
                <path className="fedge-halo" d={p.d} ref={edgeRef(p.i, "halo")} />
                <path className="fedge-line" d={p.d} ref={edgeRef(p.i, "line")} />
                <circle className="fpulse-halo" r="6.5" ref={edgeRef(p.i, "pulseHalo")} />
                <circle className="fpulse" r="3.2" ref={edgeRef(p.i, "pulse")} />
                {p.label && (
                  <text className="flow-lbl" x={p.lx} y={p.ly} textAnchor="middle" ref={edgeRef(p.i, "lbl")}>
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {vertical
            ? byCol.map((list, c) => (
                <Fragment key={c}>
                  <span className="fstage-v" ref={(el) => { stageEls.current[c] = el; }}>
                    Stage {pad2(c + 1)}
                  </span>
                  {list.map(renderNode)}
                </Fragment>
              ))
            : order.map(renderNode)}
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
