import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { canRun3D, particleBudget } from "../motion/prefs.js";
import { makeLayout, spreadFor, CAMERA_Z, CAMERA_FOV } from "./layout.js";
import { loadLogoTargets, logoPlacement } from "./logo.js";

const HeroScene = lazy(() => import("./HeroScene.jsx"));

/*
  The gate in front of the 3D scene.

  - Capable device, motion allowed: sample the logo, load the WebGL
    chunk after the page has painted, fade the scene in over the
    espresso ground.
  - Otherwise: draw the formed mark once on a plain 2D canvas. No
    WebGL, no animation, same picture — reduced-motion readers and old
    devices get a finished-looking hero, never a blank one.
*/
export function Field({ progress, ambient = false, active = true }) {
  const mode = useMemo(() => (canRun3D() ? "gl" : "poster"), []);
  const place = ambient ? "aside" : "hero";
  const count = useMemo(() => particleBudget(), []);
  const [targets, setTargets] = useState(undefined);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);

  // Sample the logo once; `null` means the image failed and the scene
  // will use its built-in stream layout instead.
  useEffect(() => {
    let alive = true;
    loadLogoTargets(count).then((t) => { if (alive) setTargets(t); });
    return () => { alive = false; };
  }, [count]);

  useEffect(() => {
    if (mode !== "gl" || targets === undefined) return;
    // Let the headline and fonts paint first; the field is decoration
    // until then.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad(true));
    return () => cancel(id);
  }, [mode, targets]);

  if (mode === "poster") {
    return (
      <div className="field poster-mode" aria-hidden="true">
        {targets !== undefined && <Poster targets={targets} place={place} />}
      </div>
    );
  }

  return (
    <div className={`field gl${ready ? " ready" : ""}`} aria-hidden="true">
      {load && (
        <Suspense fallback={null}>
          <HeroScene
            progress={progress}
            count={count}
            ambient={ambient}
            targets={targets}
            place={place}
            active={active}
            onReady={() => setReady(true)}
          />
        </Suspense>
      )}
    </div>
  );
}

/* Static render of the formed mark, projected with the same camera
   maths as the WebGL scene. Redrawn on resize. */
function Poster({ targets, place = "hero", count = 6000 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const layout = makeLayout(count, 11);
    const logo = targets && targets.targets.length >= count * 3 ? targets : null;

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

      const aspect = w / h;
      const f = (h / 2) / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
      const pl = logo ? logoPlacement(aspect, place) : { scale: spreadFor(aspect), x: 0, y: 0 };
      const src = logo ? logo.targets : layout.stream;
      const ts = logo ? logo.ts : layout.ts;
      const { sizes } = layout;

      for (let i = 0; i < count; i++) {
        const x = src[i * 3] * pl.scale + pl.x;
        const y = src[i * 3 + 1] * pl.scale + pl.y;
        const z = src[i * 3 + 2];
        const s = f / (CAMERA_Z - z);
        const px = w / 2 + x * s;
        const py = h / 2 - y * s;
        const t = ts[i];
        const r = Math.max(0.7, sizes[i] * 1.1 * (s / f) * 4.4);
        const light = 0.45 + 0.4 * Math.sin(t * Math.PI);
        ctx.fillStyle = `rgba(${Math.round(200 + 46 * light)}, ${Math.round(168 + 60 * light)}, ${Math.round(120 + 88 * light)}, ${0.5 + 0.3 * light})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [count, targets, place]);

  return <canvas className="poster" ref={ref} />;
}
