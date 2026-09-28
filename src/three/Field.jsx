import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { canRun3D, particleBudget } from "../motion/prefs.js";
import { makeLayout, spreadFor, CAMERA_Z, CAMERA_FOV } from "./layout.js";

const HeroScene = lazy(() => import("./HeroScene.jsx"));

/*
  The gate in front of the 3D scene.

  - Capable device, motion allowed: load the WebGL chunk after the page
    has painted, fade the scene in over the espresso ground.
  - Otherwise: draw the finished stream once on a plain 2D canvas. No
    WebGL, no animation, same picture — reduced-motion readers and old
    devices get a finished-looking hero, never a blank one.
*/
export function Field({ progress, ambient = false, active = true }) {
  const mode = useMemo(() => (canRun3D() ? "gl" : "poster"), []);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (mode !== "gl") return;
    // Let the headline and fonts paint first; the field is decoration
    // until then.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad(true));
    return () => cancel(id);
  }, [mode]);

  if (mode === "poster") {
    return (
      <div className="field poster-mode" aria-hidden="true">
        <Poster />
      </div>
    );
  }

  return (
    <div className={`field gl${ready ? " ready" : ""}`} aria-hidden="true">
      {load && (
        <Suspense fallback={null}>
          <HeroScene
            progress={progress}
            count={particleBudget()}
            ambient={ambient}
            active={active}
            onReady={() => setReady(true)}
          />
        </Suspense>
      )}
    </div>
  );
}

/* Static render of the formed stream, projected with the same camera
   maths as the WebGL scene. Redrawn on resize. */
function Poster({ count = 2800 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const layout = makeLayout(count, 11);

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
      ctx.globalCompositeOperation = "lighter";

      const f = (h / 2) / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
      const spread = spreadFor(w / h);
      const { stream, ts, sizes } = layout;

      for (let i = 0; i < count; i++) {
        const x = stream[i * 3] * spread;
        const y = stream[i * 3 + 1];
        const z = stream[i * 3 + 2];
        const s = f / (CAMERA_Z - z);
        const px = w / 2 + x * s;
        const py = h / 2 - y * s;
        const t = ts[i];
        const r = Math.max(0.6, sizes[i] * 0.85 * (s / f) * 4.2);
        const light = 0.45 + t * 0.55;
        ctx.fillStyle = `rgba(${Math.round(200 + 46 * light)}, ${Math.round(168 + 60 * light)}, ${Math.round(120 + 88 * light)}, ${0.28 + 0.5 * t})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [count]);

  return <canvas className="poster" ref={ref} />;
}
