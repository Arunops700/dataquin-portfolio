import { useEffect, useState } from "react";

/* Motion and capability preferences, read once and kept in sync.

   Two things decide how much the site moves:
   - prefers-reduced-motion: smooth scroll, ambient loops and the 3D
     field are all switched off; scroll-linked reveals stay, because
     they only move when the reader moves.
   - can the device run the 3D field at all: WebGL present, no
     Save-Data request, and the reader hasn't asked for reduced motion. */

const mq = (q) => (typeof window !== "undefined" ? window.matchMedia(q) : null);

const prefersReducedMotion = () => !!mq("(prefers-reduced-motion: reduce)")?.matches;
export const isCoarsePointer = () => !!mq("(pointer: coarse)")?.matches;

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

let webglCache = null;
function hasWebGL() {
  if (webglCache != null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function canRun3D() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (navigator.connection?.saveData) return false;
  return hasWebGL();
}

/* Particle budget: enough grains to keep the big mark's strokes solid;
   phones and weak machines get a lighter field. */
export function particleBudget() {
  const small = window.innerWidth < 760 || isCoarsePointer();
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  if (small || weak) return 5000;
  return 14000;
}
