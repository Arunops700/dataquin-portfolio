import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import { canRun3D, isLitePath, particleBudget, useReducedMotion } from "../motion/prefs.js";
import { useProgress } from "../motion/scroll.js";
import { loadLogoShapes } from "./logo.js";
import Poster from "./Poster.jsx";

// One download shared by the warm-up and every mount. A failed one is not
// kept (React.lazy would cache the rejection for good): the next mount,
// with its own lazy component, tries again.
let scene = null;
const loadScene = () =>
  (scene ??= import("./HeroScene.jsx").catch((e) => { scene = null; throw e; }));

// A lost WebGL context (a GPU reset, the browser reclaiming contexts in a
// background tab) remounts the scene, at most this often per page load
let retriesLeft = 2;

/* The scene is decoration. If the chunk fails to load or WebGL throws,
   it reports up and the field switches to the poster — the page-level
   boundary never sees it, and the hero never goes blank. */
class SceneBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    console.error("3D scene disabled:", error);
    this.props.onFail?.();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

const grainsFor = (place) =>
  place === "band" ? 1600 : place === "aside" ? Math.round(particleBudget() / 3) : particleBudget();

/* The field's size in 64px steps: the scene's pixel budget depends on it,
   and a resize should not re-render the canvas for every pixel. */
function useBox() {
  const [box, setBox] = useState(null);
  const el = useRef(null);
  const attach = useCallback((node) => {
    el.current = node;
    if (!node) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(64, Math.round(e.contentRect.width / 64) * 64);
      const h = Math.max(64, Math.round(e.contentRect.height / 64) * 64);
      setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
    });
    ro.observe(node);
    return () => {
      ro.disconnect();
      el.current = null;
    };
  }, []);
  return [box, attach, el];
}

/* The mark turns as its hero section scrolls away (tracking the section,
   not the field: the phone band would turn only while hidden under the
   topbar). Mounted once the field has been measured, so `field` is
   attached; the section is resolved before useProgress's own layout
   effect reads it. */
function Turn({ field, into }) {
  const section = useRef(null);
  useLayoutEffect(() => {
    section.current = field.current?.closest("section") ?? field.current;
  }, [field]);
  const away = useProgress(section, ["start start", "end start"]);
  useEffect(() => {
    into.set(away.get());
    return away.on("change", (v) => into.set(v));
  }, [away, into]);
  return null;
}

/*
  The gate in front of the 3D scene, and its API:

    <Field place="hero" | "aside" | "band" active={bool} />

  Every place shows the same scene: as the page opens the grains gather
  from their rows into six streams of data flowing behind the solid DQ
  mark, which materialises over them; the mark turns a little as its
  hero scrolls away.
  - "hero":  the landing hero — large, owning the right of the stage.
  - "aside": the Work hero on desktop — far right of the headline.
  - "band":  the Work hero at ≤ 860px — a ruled strip of reserved height
             above the headline; lite render path, the poster shown until
             the scene is ready.

  WebGL2 available: the outline loads, the WebGL chunk loads when the
  page is idle, and the scene fades in. Reduced motion renders the same
  scene as a finished still. No WebGL2, Save-Data, a scene error, a
  shader that fails to compile or a context lost more than twice in a
  visit: the 2D poster. A lost context is retried with a fresh scene once
  the page is visible again, when the browser restores it, or after a
  short wait.
*/
export function Field({ place = "hero", active = true }) {
  // null until probed: the probe creates (and at once releases) a WebGL2
  // context, a synchronous GPU round trip that must not hold up the first
  // paint — so it runs when the page is idle. A yes starts the scene's
  // chunk downloading straight away (the lazy component reuses it).
  const [gl, setGl] = useState(null);
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => {
      const ok = canRun3D();
      if (ok) loadScene().catch(() => {}); // a failure resurfaces through lazy → SceneBoundary
      setGl(ok);
    }, { timeout: 800 });
    return () => cancel(id);
  }, []);
  const still = useReducedMotion();
  const lite = useMemo(() => isLitePath(place), [place]);
  const count = useMemo(() => (gl ? grainsFor(place) : 0), [gl, place]);
  const [traced, setTraced] = useState(undefined);   // the outline: poster and mark
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [box, attach, el] = useBox();
  const markReady = useCallback(() => setReady(true), []);
  const fail = useCallback(() => setFailed(true), []);
  const yaw = useMotionValue(0);

  // A lost context parks the scene (its loop stopped) until it can retry:
  // `lostCanvas` is the canvas that lost it, `attempt` keys the remount —
  // and a fresh lazy component, so a chunk that failed is fetched again.
  const [attempt, setAttempt] = useState(0);
  const [lostCanvas, setLostCanvas] = useState(null);
  const HeroScene = useMemo(() => lazy(loadScene), [attempt]);
  const lost = useCallback((why, canvas) => {
    if (why === "lost" && canvas && retriesLeft > 0) {
      retriesLeft--;
      setLostCanvas(canvas);
    } else setFailed(true);
  }, []);
  useEffect(() => {
    if (!lostCanvas) return undefined;
    const again = () => {
      if (document.hidden) return;   // a background tab: wait until it is seen
      setLostCanvas(null);
      setAttempt((n) => n + 1);
    };
    const t = setTimeout(again, 2000);
    document.addEventListener("visibilitychange", again);
    lostCanvas.addEventListener("webglcontextrestored", again);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", again);
      lostCanvas.removeEventListener("webglcontextrestored", again);
    };
  }, [lostCanvas]);

  // The outline loads at once (the poster needs it whatever the probe
  // says). It may come back null: the scene then does without the solid.
  useEffect(() => {
    let alive = true;
    loadLogoShapes().then((t) => { if (alive) setTraced(t); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!gl || failed || traced === undefined) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad(true), { timeout: 1500 });
    return () => cancel(id);
  }, [gl, failed, traced]);

  // still probing (gl null): styled for the scene, as capable devices were
  const poster = gl === false || failed;
  const outline = traced;
  return (
    <div
      ref={attach}
      className={poster ? "field poster-mode" : `field gl${ready ? " ready" : ""}`}
      data-place={place}
      data-lite={lite && !poster ? "" : undefined}
      aria-hidden="true"
    >
      {outline && (poster || place === "band") && <Poster outline={outline} place={place} />}
      {box && <Turn field={el} into={yaw} />}
      {!poster && load && box && (
        <SceneBoundary key={attempt} onFail={fail}>
          <Suspense fallback={null}>
            <HeroScene
              place={place}
              yaw={yaw}
              count={count}
              outers={outline ? outline.outers : null}
              still={still}
              /* keep the loop running until the first frame has been drawn;
                 only then does visibility get to pause it */
              active={(active || !ready) && !lostCanvas}
              box={box}
              onReady={markReady}
              onLost={lost}
            />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}
