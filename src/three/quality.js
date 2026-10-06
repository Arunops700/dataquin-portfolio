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
  { id: "lite", dpr: 1.5, px: 0.8e6, lite: true, grains: 1 },   // phones start light: fill rate, heat, battery
  { id: "lite-low", dpr: 1.2, px: 0.55e6, lite: true, grains: 0.6 },
];

export function initialTierIndex() {
  if (isLitePath()) return 3;
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
export function dprRange(tier, box) {
  const px = tier.px;
  const area = Math.max(1, (box?.w || window.innerWidth) * (box?.h || window.innerHeight));
  return [1, Math.max(1, Math.min(tier.dpr, Math.sqrt(px / area)))];
}

/* Measures real frames only: the warm-up (shader compile, the studio
   bake, the entrance) is skipped, and frames over 250ms — tab switches,
   a paused loop — are ignored. Two bad two-second windows in a row step
   the tier down, then it waits before judging again.
   A steady ~30fps is a cap, not overload: iOS Low Power Mode and Chrome's
   Energy Saver halve the frame rate, evenly. An overloaded GPU misses
   frames unevenly, so a window only counts as bad when it is slow and
   not that steady. */
export function Governor({ enabled, onStepDown }) {
  const s = useRef({ t: 0, n: 0, q: 0, warm: 2.0, bad: 0 });
  useEffect(() => {
    const reset = () => Object.assign(s.current, { t: 0, n: 0, q: 0, warm: Math.max(s.current.warm, 1.0), bad: 0 });
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
    r.q += dt * dt;
    if (r.t < 2) return;
    const mean = r.t / r.n;
    const sd = Math.sqrt(Math.max(0, r.q / r.n - mean * mean));
    r.t = 0;
    r.n = 0;
    r.q = 0;
    const capped = mean > 0.03 && mean < 0.037 && sd < 0.2 * mean;   // a steady ~33ms frame
    r.bad = 1 / mean < 48 && !capped ? r.bad + 1 : 0;   // absolute: fine on 60 and 120Hz alike
    if (r.bad >= 2) {
      r.bad = 0;
      r.warm = 1.5;
      onStepDown();
    }
  }, -3);
  return null;
}
