/*
  The hero story, as the 3D scene reads it. Three-free: the rig in the
  3D chunk imports it, and so could anything in the main bundle.

  The beat ranges come from STORY_BEATS, so retiming the copy retimes
  the scene.
*/
import { STORY_BEATS } from "../data/site.js";

export const TIMING = { GATHER: 2.2, MATERIALISE: 1.2 };   // the entrance, in seconds
/* The frozen clock of reduced motion: the ledger sheet ~78% filled, the
   looping grains spread along the bridge — every hold a finished frame. */
export const STILL_TIME = 12.4;

const [PROBLEM, BUILD, RESULT] = STORY_BEATS.map((b) => b.range);
/* How far into its range a beat's copy is fully in. Landing.jsx Beat lands
   the paragraph at +0.03 plus the reveal window: 0.05, or 0.012 in reduced
   motion, where the copy cuts in. */
const COPY_IN = { motion: 0.08, still: 0.042 };
const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);   // NaN → 0
const span = (v, a, b) => clamp01((v - a) / (b - a));

/* Story progress (damped) → linear 0..1 weights. Each 3D state completes
   just before its copy is fully in, in either motion mode, so a still
   frame taken while a beat's copy is shown always looks finished. The
   shader staggers them per grain. */
export function storyWeights(sp, w = {}, still = false) {
  const done = (still ? COPY_IN.still : COPY_IN.motion) - 0.01;
  w.leave = span(sp, PROBLEM[0] - 0.05, PROBLEM[0] + done);           // the halo drains into the ledger sheet
  w.cross = span(sp, BUILD[0], BUILD[1] - 0.03);                       // sheet → bridge → mark
  w.loop = span(sp, BUILD[0] - 0.03, BUILD[0] + 0.03) *
    (1 - span(sp, BUILD[1] - 0.02, BUILD[1] + 0.04));                  // the live stream on the bridge
  w.settle = span(sp, RESULT[0] - 0.02, RESULT[0] + done);            // mark → ruled orbit rings
  w.sweep = span(sp, RESULT[0] + 0.02, RESULT[0] + 0.24);             // light crosses the mark
  w.dim = w.leave * (1 - w.cross);                                     // lights down while the work is manual
  return w;
}

/* Critically damped spring with a speed limit: a scroll jump plays the
   story fast-forward, never teleports. */
export function stepSpring(s, target, dt, omega = 9, vmax = 1.8) {
  const a = omega * omega * (target - s.x) - 2 * omega * s.v;
  s.v = Math.max(-vmax, Math.min(vmax, s.v + a * dt));
  s.x += s.v * dt;
}
