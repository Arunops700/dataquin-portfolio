import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { storyWeights, stepSpring, TIMING, STILL_TIME } from "./story.js";
import { POSE, logoPlacement, stageLayout } from "./logo.js";
import { MQ } from "../motion/tokens.js";

/*
  The rig: one place that turns time, scroll and pointer into the scene's
  state each frame. It runs first (useFrame priority −1); the mark, the
  grains and the bloom copy their values out of it. Nothing else in the
  scene reads a clock or a MotionValue.

  - Its own clock advances only on rendered frames, so a loop paused
    off-screen never jumps when it resumes.
  - Idle motion settles (WCAG 2.2.2): ~5s after the last scroll or pointer
    move the clock eases to a stop and the loop rests; the next one wakes
    it and the clock eases back up (useIdle). Scroll-driven motion never
    waits on it.
  - Story progress is a spring-damped copy of the scroll, snapped on the
    first frame, after a pause, and always in reduced motion: a jump plays
    the story fast-forward in order, never teleports, never replays.
  - Reduced motion (`still`): the clock is frozen on a finished frame, no
    idle motion, no pointer; one frame is drawn per scroll step, nothing
    at rest.
  - The landing hero composes for its visible window (`win`). A stage
    taller than the screen shows its top at the page top, then sticks with
    its foot on the viewport's foot for the story. The camera frames the
    top window until the story starts and slides to the foot while the
    headline fades — the stage is stuck by then, so nothing judders — and
    the rest of the canvas extends the same view.
*/

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);   // NaN → 0: one bad scroll value must not poison the spring
const SLIDE = [0.02, 0.17];                              // story progress: the view slides to a tall stage's foot

export function createRig() {
  return {
    time: 0, t: 0, start: null, last: 0, spring: { x: 0, v: 0 }, inited: false, speed: 0, w: {}, motion: 1,
    gather: 0, halo: 0, reveal: 0,
    input: 0, idle: 1, resting: false,                    // the idle clock: last input (ms), its rate 0..1, loop at rest
    mark: Object.assign(new THREE.Object3D(), { matrixAutoUpdate: false }),
    lane: new THREE.Vector4(2, 2, 0.12, 0),               // ndc x edge, ndc y edge, feather, strength
    aspect: 1, pl: null, layout: null,                    // the composed window's shape and layout,
    lw: -1, lh: -1, lv: -1,                               // for this canvas width, height and window
    pointer: { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 },
    mat: { roughness: 0.3, env: 1, clearcoat: 0.6, emissive: 0.02 },
    sweep: -1, sweepAmt: 0, envRot: 0, bloom: 0.28,
  };
}

/* The camera frames the `win` px of a canvas `h` tall that start `top` px
   down it (all of it when they match). R3F resets the aspect on every
   resize and pixel-ratio change, so this is checked each frame. */
function frameWindow(cam, w, h, win, top) {
  if (h - win > 0.5) {
    const v = cam.view;
    if (!v?.enabled || cam.aspect !== w / win || v.fullWidth !== w || v.fullHeight !== win || v.height !== h || v.offsetY !== -top) {
      cam.setViewOffset(w, win, 0, -top, w, h);
    }
  } else if (cam.view?.enabled) {
    cam.clearViewOffset();
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
}

/* Mounted once, first inside <Canvas>. `fixed` pins the story (1 = the
   settled result) for the Work page; `yaw` (0..1) turns the mark as the
   Work hero scrolls away; `win` is the landing hero's visible window
   height (CSS px); `onRest(bool)` is told when the idle motion has come
   to a stop (the loop may rest) and when it wakes. */
export function StoryRig({ rig, place, progress, yaw, fixed, still, active, skipEntrance, win = 0, onRest }) {
  const invalidate = useThree((s) => s.invalidate);

  // reduced motion: a frame whenever anything that drives the pose moves
  useEffect(() => {
    if (!still || !active) return;
    const offs = [progress, yaw].filter(Boolean).map((mv) => mv.on("change", () => invalidate()));
    return () => offs.forEach((off) => off());
  }, [still, active, progress, yaw, invalidate]);
  // the window can change without the canvas resizing
  useEffect(() => { invalidate(); }, [win, invalidate]);

  usePointerSpring(rig, still || place === "band");
  useIdle(rig, still, onRest, invalidate);

  useFrame((state, delta) => {
    const r = rig.current;
    const dt = Math.min(delta, 1 / 20);                  // hitches never jump the springs
    const now = performance.now();
    const gap = r.last ? now - r.last : 0;               // > 250ms: the loop was paused
    r.last = now;
    // the idle clock: full rate through the entrance and while the reader
    // scrolls or moves the pointer, eased to a stop once they have not
    let rate = 0;
    if (!still) {
      const settling = r.halo >= 1 && now - r.input > IDLE.after;
      r.idle = settling ? Math.max(0, r.idle - dt / IDLE.out) : Math.min(1, r.idle + dt / IDLE.in);
      rate = smooth(r.idle);
      r.time += dt * rate;
    }
    const t = still ? STILL_TIME : r.time;
    r.t = t;
    r.motion = still ? 0 : 1;

    // entrance (time): rows → written onto the mark → lifted into the halo
    // (a scene that opens still counts it as played, so switching motion
    // back on mid-visit never replays it)
    if (r.start == null) r.start = skipEntrance || still ? -1e6 : r.time;
    const age = still ? 1e6 : r.time - r.start;
    r.gather = clamp01(age / (TIMING.GATHER + 0.3));
    r.reveal = clamp01((age - TIMING.GATHER + 0.25) / TIMING.MATERIALISE);
    r.halo = clamp01((age - TIMING.GATHER - 0.1) / (TIMING.MATERIALISE + 0.7));

    // story (scroll)
    const target = clamp01(fixed ?? (progress ? progress.get() : 0));
    if (!r.inited || still || gap > 250) {
      r.spring.x = target;
      r.spring.v = 0;
      r.inited = true;
    } else stepSpring(r.spring, target, dt);
    r.speed = still ? 0 : Math.min(1, Math.abs(r.spring.v) / 1.2);
    const w = storyWeights(r.spring.x, r.w, still);

    // the window the scene composes in, its placement and copy lane
    // (recomputed only when a size changes)
    const { width, height } = state.size;
    const view = place === "hero" && win > 0 ? Math.min(height, win) : height;
    if (r.lw !== width || r.lh !== height || r.lv !== view) {
      r.lw = width;
      r.lh = height;
      r.lv = view;
      r.aspect = width / Math.max(1, view);
      r.pl = logoPlacement(r.aspect, place, view);
      r.layout = stageLayout(width, r.aspect, view);
    }
    const over = height - view;
    const top = over > 0.5 ? over * smooth(clamp01((r.spring.x - SLIDE[0]) / (SLIDE[1] - SLIDE[0]))) : 0;
    frameWindow(state.camera, width, height, view, top);
    const pl = r.pl;
    const L = r.layout;

    // the mark: squares up for the result. Sway and pointer together turn
    // it by at most 0.255 (0.07 + 0.025 + 0.16) either way.
    const s = w.settle;
    const P = r.pointer;
    const sway = still ? 0 : 0.07 * Math.sin(0.31 * t) + 0.025 * Math.sin(0.83 * t + 1.3);
    const nod = still ? 0 : 0.03 * Math.sin(0.23 * t + 0.7);
    const bob = still ? 0 : 0.05 * Math.sin(0.4 * t);
    const turn = yaw ? clamp01(yaw.get()) * 0.5 : 0;
    const m = r.mark;
    m.position.set(pl.x, pl.y + bob, 0);
    m.rotation.set(
      -0.12 + 0.08 * s + nod + P.y * 0.1,
      POSE.yaw - 0.14 * s + sway + P.x * 0.16 + turn,
      0
    );
    m.scale.setScalar(pl.scale * (0.94 + 0.06 * smooth(r.reveal)) * (1 + 0.03 * s));
    m.updateMatrix();

    // the copy lane, in the canvas's ndc (a y edge is given in the window's)
    if (place === "hero") {
      const ly = L.lane[1] >= 1 ? 2 : 1 - (2 * top + (1 - L.lane[1]) * view) / height;
      r.lane.set(L.lane[0], ly, L.lane[2], 0.5 * w.leave);   // the headline keeps today's look
    } else if (place === "aside") r.lane.set(0.3, 2, 0.12, 0.35);   // the Work headline, left
    else r.lane.w = 0;

    // light. Phones dim the mark by light, never by transparency.
    const dimPl = pl.alpha ?? 1;
    r.mat.roughness = 0.3 - 0.04 * s;
    r.mat.env = (1.0 + 0.15 * s) * dimPl;
    r.mat.clearcoat = 0.6;                               // never 0: crossing 0 recompiles the program
    r.mat.emissive = 0.02 + 0.25 * 4 * w.cross * (1 - w.cross);   // a warm lift as the grains arrive

    // light sweep: scroll owns it while the result's sweep is under way;
    // otherwise an idle glint every 11s (never in reduced motion), fading
    // with the idle clock so a glint never stops on the mark
    const gk = (t % 11) / 11;
    if (w.sweep > 0 && w.sweep < 1) {
      r.sweep = -0.2 + 1.4 * smooth(w.sweep);
      r.sweepAmt = Math.sin(Math.PI * w.sweep);
    } else if (!still && gk < 0.16) {
      r.sweep = -0.2 + 1.4 * (gk / 0.16);
      r.sweepAmt = 0.45 * Math.sin((Math.PI * gk) / 0.16) * rate;
    } else {
      r.sweep = -1;
      r.sweepAmt = 0;
    }
    r.envRot = still ? 0 : 0.3 * Math.sin(t * ((2 * Math.PI) / 26));   // sways, never spins the light away
    r.bloom = 0.28 + 0.1 * Math.sin(Math.PI * w.sweep);

    // at rest: the idle clock stopped, the story spring and the pointer
    // settled — nothing left to draw until the next input
    if (
      !still && !r.resting && r.idle === 0 &&
      Math.abs(r.spring.v) < 1e-3 && Math.abs(target - r.spring.x) < 1e-3 &&
      Math.abs(P.vx) + Math.abs(P.vy) < 1e-3 && Math.abs(P.tx - P.x) + Math.abs(P.ty - P.y) < 1e-3
    ) {
      r.resting = true;
      onRest?.(true);
    }
  }, -1);

  return null;
}

/* WCAG 2.2.2: nothing moves on its own for longer than 5s. The idle clock
   (the glint, the light's sway, the mark's drift, the streams' flow) eases
   to a stop `after` ms past the last scroll or pointer input, over `out`
   seconds, and eases back up over `in` on the next. */
const IDLE = { after: 5000, out: 1.0, in: 0.5 };

/* Wakes the idle clock on scroll and pointer input (and a loop at rest
   with it). Waking from a rest keeps the story spring running: the pause
   was a rest, not the loop parked off-screen, so the spring must not snap. */
function useIdle(rig, off, onRest, invalidate) {
  const rest = useRef(onRest);
  rest.current = onRest;
  useEffect(() => {
    const r = rig.current;
    r.input = performance.now();
    if (off) return undefined;
    const wake = () => {
      r.input = performance.now();
      if (!r.resting) return;
      r.resting = false;
      r.last = 0;
      rest.current?.(false);
      invalidate();
    };
    const opts = { passive: true };
    window.addEventListener("scroll", wake, opts);
    window.addEventListener("pointermove", wake, opts);
    window.addEventListener("pointerdown", wake, opts);
    return () => {
      window.removeEventListener("scroll", wake, opts);
      window.removeEventListener("pointermove", wake, opts);
      window.removeEventListener("pointerdown", wake, opts);
      if (r.resting) {
        r.resting = false;
        rest.current?.(false);
      }
    };
  }, [rig, off, invalidate]);
}

/* The mark leans toward a mouse pointer and comes back to rest when the
   pointer leaves the page, the window loses focus or the tab hides.
   Critically damped (settles in ~0.6s, no overshoot). Mouse and pen with
   hover only: never on touch, in reduced motion, or in the Work band. */
function usePointerSpring(rig, off) {
  useEffect(() => {
    const P = rig.current.pointer;
    P.tx = 0;
    P.ty = 0;
    if (off || !window.matchMedia(MQ.fine).matches) return;
    const move = (e) => {
      if (e.pointerType === "touch") return;
      P.tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
      P.ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
    };
    const rest = () => { P.tx = 0; P.ty = 0; };
    const root = document.documentElement;
    window.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", rest);
    window.addEventListener("blur", rest);
    document.addEventListener("visibilitychange", rest);
    return () => {
      window.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", rest);
      window.removeEventListener("blur", rest);
      document.removeEventListener("visibilitychange", rest);
    };
  }, [rig, off]);

  useFrame((_, delta) => {
    const P = rig.current.pointer;
    if (off) {
      P.x = P.y = P.vx = P.vy = 0;
      return;
    }
    const dt = Math.min(delta, 1 / 20);
    const w = 6.5;
    P.vx += (w * w * (P.tx - P.x) - 2 * w * P.vx) * dt;
    P.x += P.vx * dt;
    P.vy += (w * w * (P.ty - P.y) - 2 * w * P.vy) * dt;
    P.y += P.vy * dt;
  }, -2);
}
