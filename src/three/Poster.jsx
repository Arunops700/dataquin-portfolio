import { useEffect, useRef } from "react";
import { halfHeightAt } from "./shared.js";
import { logoPlacement } from "./logo.js";
import { PAL } from "./palette.js";

/*
  The mark drawn once in 2D: the fallback when WebGL is missing, declined
  (Save-Data) or fails, and the Work band's first paint while its scene
  loads. Same outline, placement and camera maths as the scene, so the
  crossfade into the live mark does not jump; the six data streams are
  drawn dotted behind it. Main bundle, no three.js.
*/
export default function Poster({ outline, place }) {
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

      const s = h / 2 / halfHeightAt(0);   // CSS px per world unit at the mark's depth
      const pl = logoPlacement(w / h, place, h);
      const cx = w / 2 + pl.x * s;
      const cy = h / 2 - pl.y * s;
      const k = pl.scale * s;

      // the streams, as the scene draws them: six dotted waves behind the
      // mark, fading in and out at their ends
      {
        ctx.save();
        const fade = ctx.createLinearGradient(cx - 5 * k, 0, cx + 5 * k, 0);
        fade.addColorStop(0, `${PAL.goldHi}00`);
        fade.addColorStop(0.14, PAL.goldHi);
        fade.addColorStop(0.86, PAL.goldHi);
        fade.addColorStop(1, `${PAL.goldHi}00`);
        ctx.strokeStyle = fade;
        ctx.globalAlpha = 0.34;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.setLineDash([0.1, 4.2]);
        for (let lane = 0; lane < 6; lane++) {
          ctx.beginPath();
          for (let i = 0; i <= 100; i++) {
            const x = -5 + i * 0.1;
            const y = (lane - 2.5) * 0.62 + 0.42 * Math.sin(x * 0.45 + lane * 1.1);
            if (i) ctx.lineTo(cx + x * k, cy - y * k); else ctx.moveTo(cx + x * k, cy - y * k);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

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
  }, [outline, place]);

  return <canvas className="poster" ref={ref} />;
}
