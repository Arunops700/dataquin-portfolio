import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

/* The scene is decoration. If the chunk fails to load or WebGL throws,
   the hero keeps its copy and the espresso ground — the page-level
   boundary must never see it. */
class SceneBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("3D scene disabled:", error); }
  render() { return this.state.failed ? null : this.props.children; }
}
import { canRun3D, particleBudget, useReducedMotion } from "../motion/prefs.js";
import { CAMERA_Z, CAMERA_FOV } from "./layout.js";
import { loadLogoTargets, logoPlacement } from "./logo.js";
import { loadLogoShapes } from "./trace.js";

const HeroScene = lazy(() => import("./HeroScene.jsx"));

/*
  The gate in front of the 3D scene.

  - WebGL available: trace the logo and sample the grains, load the
    WebGL chunk after the page has painted, fade the scene in. With
    reduced motion the same gold mark is rendered still: no gather, no
    sway, no parallax.
  - No WebGL (or Save-Data): draw the mark's outline once, filled gold,
    on a plain 2D canvas. Never a blank hero.
*/
export function Field({ progress, ambient = false, active = true }) {
  const gl = useMemo(() => canRun3D(), []);
  const still = useReducedMotion();
  const place = ambient ? "aside" : "hero";
  // the ambient mark on the Work page is smaller: a third of the grains
  // keeps its dust halo airy rather than a snow globe
  const count = useMemo(() => (ambient ? Math.round(particleBudget() / 3) : particleBudget()), [ambient]);
  const [assets, setAssets] = useState(undefined);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadLogoShapes(), loadLogoTargets(count)]).then(([traced, targets]) => {
      if (alive) setAssets({ traced, targets });
    });
    return () => { alive = false; };
  }, [count]);

  useEffect(() => {
    if (!gl || assets === undefined) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad(true));
    return () => cancel(id);
  }, [gl, assets]);

  if (!gl) {
    return (
      <div className="field poster-mode" aria-hidden="true">
        {assets?.traced && <Poster traced={assets.traced} place={place} />}
      </div>
    );
  }

  return (
    <div className={`field gl${ready ? " ready" : ""}`} aria-hidden="true">
      {load && (
        <SceneBoundary>
        <Suspense fallback={null}>
          <HeroScene
            progress={progress}
            count={count}
            targets={assets.targets}
            outers={assets.traced ? assets.traced.outers : null}
            place={place}
            still={still}
            /* keep the loop running until the first frame has been drawn;
               only then does visibility get to pause it */
            active={active || !ready}
            onReady={() => setReady(true)}
          />
        </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}

/* No-WebGL fallback: the traced outline filled with a gold gradient,
   projected with the same camera maths as the scene. */
function Poster({ traced, place }) {
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
      const f = (h / 2) / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
      const s = f / CAMERA_Z;
      const pl = logoPlacement(w / h, place);
      const { polys, W, H } = traced;
      const toScreen = ([x, y]) => [
        w / 2 + ((x / W - 0.5) * 8.8 * pl.scale + pl.x) * s,
        h / 2 - (-(y / H - 0.5) * 8.8 * (H / W) * pl.scale + pl.y) * s,
      ];
      const path = new Path2D();
      polys.forEach((p) => {
        p.forEach((pt, i) => {
          const [px, py] = toScreen(pt);
          if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
        });
        path.closePath();
      });
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#8a6c49");
      grad.addColorStop(0.45, "#d3b789");
      grad.addColorStop(0.7, "#f0e0c2");
      grad.addColorStop(1, "#a5824f");
      ctx.fillStyle = grad;
      ctx.fill(path, "evenodd");
    };
    draw();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    ro.observe(c);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [traced, place]);
  return <canvas className="poster" ref={ref} />;
}
