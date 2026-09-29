import { useEffect, useRef } from "react";
import { halfHeightAt } from "./shared.js";
import { logoPlacement } from "./logo.js";
import { PAL } from "./palette.js";

/*
  The mark drawn once in 2D: the fallback when WebGL is missing, declined
  (Save-Data) or fails, and the Work band's first paint while its scene
  loads. Same outline, placement and camera maths as the scene — the hero
  composed for the window it opens on (`win` tall, at the top of a stage
  taller than the screen) — so the crossfade into the live mark does not
  jump. Settled places also draw
  the four orbit rings, dotted — the near arcs over the mark, the far
  arcs under it. Main bundle, no three.js.
*/
export default function Poster({ outline, place, settled, win = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const view = win > 0 ? Math.min(h, win) : h;
      const s = view / 2 / halfHeightAt(0);   // CSS px per world unit at the mark's depth
      const pl = logoPlacement(w / view, place, view);
      const cx = w / 2 + pl.x * s;
      const cy = view / 2 - pl.y * s;
      const k = pl.scale * s;

      // the rings, as the scene draws them settled: flat ellipses tipped
      // toward the viewer
      const rings = (from, to) => {
        ctx.save();
        ctx.strokeStyle = PAL.goldHi;
        ctx.globalAlpha = 0.34;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.setLineDash([0.1, 4.2]);
        for (let lane = 0; lane < 4; lane++) {
          const rr = 1 + 0.12 * lane;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 3.3 * rr * k, 2 * rr * Math.sin(0.55 + 0.04 * lane) * k, 0, from, to);
          ctx.stroke();
        }
        ctx.restore();
      };
      if (settled) rings(Math.PI, Math.PI * 2);   // far (upper) arcs: behind the mark

      const path = new Path2D();
      const trace = (pts) => {
        pts.forEach(([x, y], i) => (i ? path.lineTo(cx + x * k, cy - y * k) : path.moveTo(cx + x * k, cy - y * k)));
        path.closePath();
      };
      outline.outers.forEach((o) => {
        trace(o.points);
        o.holes.forEach(trace);
      });
      // foil across the mark itself, top-left to bottom-right
      const grad = ctx.createLinearGradient(cx - 2.3 * k, cy - 2.3 * k, cx + 2.3 * k, cy + 2.3 * k);
      grad.addColorStop(0, PAL.bronze);
      grad.addColorStop(0.45, PAL.goldMid);
      grad.addColorStop(0.7, PAL.champagne);
      grad.addColorStop(1, PAL.gold);
      ctx.globalAlpha = pl.alpha ?? 1;   // phones dim the mark behind the copy, as the scene does
      ctx.fillStyle = grad;
      ctx.fill(path, "evenodd");
      ctx.globalAlpha = 1;

      if (settled) rings(0, Math.PI);   // near (lower) arcs: in front
    };
    draw();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    ro.observe(c);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [outline, place, settled, win]);

  return <canvas className="poster" ref={ref} />;
}
