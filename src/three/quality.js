import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { isLitePath } from "../motion/prefs.js";

/*
  Quality tiers and the frame-rate governor (3D chunk only).

  A tier sets the pixel ratio cap, a pixel budget, MSAA, bloom and the
  share of grains drawn. The composer family and the lite family (no
  composer, native antialiasing, transparent canvas) never swap: the
  WebGL context attributes are fixed when the canvas is created.
*/
export const TIERS = [
  { id: "high", dpr: 1.5, px: 3.7e6, msaa: 4, bloom: true, grains: 1 },
  { id: "mid", dpr: 1.25, px: 2.5e6, msaa: 2, bloom: true, grains: 0.8 },
  { id: "low", dpr: 1.0, px: 2.1e6, msaa: 2, bloom: false, grains: 0.55 },
  { id: "lite", dpr: 2.0, px: 1.2e6, lite: true, grains: 1 },
  { id: "lite-low", dpr: 1.25, px: 0.8e6, lite: true, grains: 0.6 },
];

export function initialTierIndex(place) {
  if (isLitePath(place)) return 3;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4;
  return weak ? 1 : 0;
}

/* Only ever steps down, and at most two steps. */
export const nextTier = (i) => (i === 0 ? 1 : i === 1 ? 2 : i === 3 ? 4 : i);

/* The pixel ratio as a Canvas PROP. R3F re-applies the dpr prop on every
   Canvas render (each frameloop flip as the hero scrolls in and out), so
   a child's setDpr would silently be undone. The array form keeps
   following window.devicePixelRatio (browser zoom, a second display).
   The pixel budget caps big screens: a 1440p-class target at most. */
export function dprRange(tier, place, box) {
  const px = place === "band" ? 0.4e6 : tier.px;
  const area = Math.max(1, (box?.w || window.innerWidth) * (box?.h || window.innerHeight));
  return [1, Math.max(1, Math.min(tier.dpr, Math.sqrt(px / area)))];
}

/* Measures real frames only: the warm-up (shader compile, the studio
   bake, the entrance) is skipped, and frames over 250ms — tab switches,
   a paused loop — are ignored. Two bad two-second windows in a row step
   the tier down, then it waits before judging again. */
export function Governor({ enabled, onStepDown }) {
  const s = useRef({ t: 0, n: 0, warm: 2.0, bad: 0 });
  useEffect(() => {
    const reset = () => Object.assign(s.current, { t: 0, n: 0, warm: Math.max(s.current.warm, 1.0), bad: 0 });
    if (enabled) reset();   // back on screen: the first second is catch-up, not evidence
    document.addEventListener("visibilitychange", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, [enabled]);
  useFrame((_, dt) => {
    const r = s.current;
    if (!enabled || dt > 0.25) return;
    if (r.warm > 0) { r.warm -= dt; return; }
    r.t += dt;
    r.n++;
    if (r.t < 2) return;
    const fps = r.n / r.t;
    r.t = 0;
    r.n = 0;
    r.bad = fps < 48 ? r.bad + 1 : 0;   // absolute: fine on 60 and 120Hz alike
    if (r.bad >= 2) {
      r.bad = 0;
      r.warm = 1.5;
      onStepDown();
    }
  }, -3);
  return null;
}
