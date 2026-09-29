import { useEffect, useState } from "react";
import { BP } from "./tokens.js";

/* Motion and capability preferences, read once and kept in sync.

   - prefers-reduced-motion: smooth scroll and ambient loops stop and
     entrances are instant; scroll-linked motion stays, because it only
     moves when the reader moves. The 3D mark still renders — as a finished
     still that redraws only while the reader scrolls (see three/Field.jsx).
   - can the device run the 3D scene at all: a hardware WebGL2 context and
     no Save-Data request. Otherwise the 2D poster of the mark is drawn. */

const mq = (q) => (typeof window !== "undefined" ? window.matchMedia(q) : null);

/* one reader for code outside React (the hook below keeps components live) */
export const prefersReducedMotion = () => !!mq("(prefers-reduced-motion: reduce)")?.matches;
const isCoarsePointer = () => !!mq("(pointer: coarse)")?.matches;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const m = mq("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const on = (e) => setReduced(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function useMedia(query) {
  const [ok, setOk] = useState(() => !!mq(query)?.matches);
  useEffect(() => {
    const m = mq(query);
    if (!m) return;
    const on = (e) => setOk(e.matches);
    on(m);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return ok;
}

/* three r186 renders with WebGL2 only. A software rasteriser (blocklisted
   GPU, no acceleration) fails the performance-caveat check and gets the
   poster. The probe's context is released at once, so the page never
   holds two. */
let webglCache = null;
function hasWebGL2() {
  if (webglCache != null) return webglCache;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    webglCache = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function canRun3D() {
  if (typeof window === "undefined") return false;
  if (navigator.connection?.saveData) return false;
  return hasWebGL2();
}

/* The lite render path — no post-processing, a transparent canvas over
   the CSS ground, native antialiasing — for touch devices and for the
   Work page's band. Decided here (main bundle) so Field can style for it
   without importing the 3D chunk. */
export const isLitePath = (place) => place === "band" || isCoarsePointer();

/* Grain budget: enough to keep the big mark's strokes solid; phones and
   weak machines get a lighter field. The frame-rate governor may draw
   fewer (three/quality.js). */
export function particleBudget() {
  const small = window.innerWidth <= BP.tablet || isCoarsePointer();
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  if (small || weak) return 7000;
  return 18000;
}
