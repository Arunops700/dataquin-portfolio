import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { canRun3D, isLitePath, particleBudget, useReducedMotion } from "../motion/prefs.js";
import { useProgress } from "../motion/scroll.js";
import { loadLogoShapes, loadLogoTargets } from "./logo.js";
import Poster from "./Poster.jsx";

const loadScene = () => import("./HeroScene.jsx");
const HeroScene = lazy(loadScene);

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

/* An element's height in CSS px: the hero's window probe (.field-win). */
function useHeight() {
  const [h, setH] = useState(0);
  const attach = useCallback((node) => {
    if (!node) return undefined;
    const ro = new ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [h, attach];
}

/*
  The gate in front of the 3D scene, and its API:

    <Field place="hero" | "aside" | "band" progress={mv} active={bool} />

  - "hero":  the landing stage. `progress` is the story progress, in the
             units of STORY_BEATS[i].range; the grains and the mark play
             the beats with it.
  - "aside": the Work hero on desktop — the settled result (the mark in
             its ruled orbit rings), far right, turning as the hero scrolls
             away. (`ambient` is kept as an alias.)
  - "band":  the Work hero at ≤ 860px — the same settled mark in a ruled
             strip of reserved height above the headline; lite render
             path, the poster shown until the scene is ready.

  WebGL2 available: the outline and grain targets load, the WebGL chunk
  loads when the page is idle, and the scene fades in. Reduced motion
  renders the same scene as finished stills that follow the scroll. No
  WebGL2, Save-Data, a scene error, a shader that fails to compile or a
  lost context: the 2D poster.

  The hero measures its visible window (.field-win, the bottom 100svh of
  the stage): the scene and the poster compose for it.
*/
export function Field({ place: placeProp, ambient = false, story, progress, yaw: yawProp, active = true }) {
  const place = placeProp ?? (ambient ? "aside" : "hero");
  const settled = (story ?? (place === "hero" ? "scroll" : "settled")) === "settled";
  // null until probed: the probe creates (and at once releases) a WebGL2
  // context, a synchronous GPU round trip that must not hold up the first
  // paint — so it runs when the page is idle. A yes starts the scene's
  // chunk downloading straight away (React.lazy reuses the module).
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
  const [targets, setTargets] = useState(undefined); // the grain targets: scene only
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [box, attach, el] = useBox();
  const [win, winRef] = useHeight();
  const markReady = useCallback(() => setReady(true), []);
  const fail = useCallback(() => setFailed(true), []);

  // The settled mark turns as its hero section scrolls away (tracking the
  // section, not the field: the phone band would turn only while hidden
  // under the topbar). Resolved before useProgress's own layout effect reads it.
  const section = useRef(null);
  useLayoutEffect(() => {
    section.current = el.current?.closest("section") ?? el.current;
  }, [el]);
  const away = useProgress(section, ["start start", "end start"]);
  const yaw = yawProp ?? (settled ? away : undefined);

  // Either may come back null (the scene then does without); neither
  // rejects. The outline loads at once (the poster needs it whatever the
  // probe says); the grain targets only once the scene can run.
  useEffect(() => {
    let alive = true;
    loadLogoShapes().then((t) => { if (alive) setTraced(t); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!gl) return undefined;
    let alive = true;
    loadLogoTargets(count).catch(() => null).then((t) => { if (alive) setTargets(t); });
    return () => { alive = false; };
  }, [gl, count]);

  useEffect(() => {
    if (!gl || failed || traced === undefined || targets === undefined) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 180));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad(true), { timeout: 1500 });
    return () => cancel(id);
  }, [gl, failed, traced, targets]);

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
      {place === "hero" && <div className="field-win" ref={winRef} />}
      {outline && (poster || place === "band") && <Poster outline={outline} place={place} settled={settled} win={win} />}
      {!poster && load && box && (
        <SceneBoundary onFail={fail}>
          <Suspense fallback={null}>
            <HeroScene
              place={place}
              settled={settled}
              progress={progress}
              yaw={yaw}
              count={count}
              targets={targets}
              outers={outline ? outline.outers : null}
              still={still}
              /* keep the loop running until the first frame has been drawn;
                 only then does visibility get to pause it */
              active={active || !ready}
              box={box}
              win={win}
              onReady={markReady}
              onLost={fail}
            />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}
