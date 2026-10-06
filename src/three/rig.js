import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { POSE, logoPlacement, stageLayout } from "./logo.js";
import { MQ } from "../motion/tokens.js";

/*
  The rig: one place that turns time and the pointer into the scene's
  state each frame. It runs first (useFrame priority −1); the mark, the
  grains and the bloom copy their values out of it. Nothing else in the
  scene reads a clock or a MotionValue.

  The scene has one story, played on a timer as the page opens: the
  grains gather from their rows into the streams while the solid mark
  materialises; then the streams flow and the mark sways.
  - Its own clock advances only on rendered frames, so a loop paused
    off-screen never jumps when it resumes.
  - Idle motion settles (WCAG 2.2.2): ~5s after the last scroll or pointer
    move the clock eases to a stop and the loop rests; the next one wakes
    it and the clock eases back up (useIdle).
  - Reduced motion (`still`): the clock is frozen on a finished frame, no
    idle motion, no pointer; a frame is drawn only when the turn moves.
*/

/* The entrance, in seconds: the grains gather, the mark materialises */
const TIMING = { GATHER: 2.2, MATERIALISE: 1.2 };
/* The frozen clock of reduced motion: the grains spread along their
   streams — a finished frame. */
const STILL_TIME = 12.4;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);   // NaN → 0

export function createRig() {
  return {
    time: 0, t: 0, start: null, motion: 1,
    gather: 0, halo: 0, reveal: 0,
    input: 0, idle: 1, resting: false,                    // the idle clock: last input (ms), its rate 0..1, loop at rest
    mark: Object.assign(new THREE.Object3D(), { matrixAutoUpdate: false }),
    lane: new THREE.Vector4(2, 2, 0.12, 0),               // ndc x edge, ndc y edge, feather, strength
    aspect: 1, pl: null, layout: null,                    // the canvas's shape and layout,
    lw: -1, lh: -1, lroom: -1,                            // for this canvas width and height, and room
    pointer: { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 },
    mat: { roughness: 0.26, env: 1.15, clearcoat: 0.6, emissive: 0.02 },
    sweep: -1, sweepAmt: 0, envRot: 0, bloom: 0.28,
  };
}

/* Mounted once, first inside <Canvas>. `yaw` (0..1) turns the mark as
   its hero scrolls away; `onRest(bool)` is told when the idle motion has
   come to a stop (the loop may rest) and when it wakes. */
export function Rig({ rig, yaw, room = 0, still, active, onRest }) {
  const invalidate = useThree((s) => s.invalidate);

  // reduced motion: a frame whenever the turn moves
  useEffect(() => {
    if (!still || !active || !yaw) return undefined;
    return yaw.on("change", () => invalidate());
  }, [still, active, yaw, invalidate]);

  usePointerSpring(rig, still);
  useIdle(rig, still, onRest, invalidate);

  useFrame((state, delta) => {
    const r = rig.current;
    const dt = Math.min(delta, 1 / 20);                  // hitches never jump the clock
    const now = performance.now();
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

    // entrance (time): rows → streams, the mark materialising over them
    // (a scene that opens still counts it as played, so switching motion
    // back on mid-visit never replays it)
    if (r.start == null) r.start = still ? -1e6 : r.time;
    const age = still ? 1e6 : r.time - r.start;
    r.gather = clamp01(age / (TIMING.GATHER + 0.3));
    r.reveal = clamp01((age - TIMING.GATHER + 0.25) / TIMING.MATERIALISE);
    r.halo = clamp01((age - TIMING.GATHER - 0.1) / (TIMING.MATERIALISE + 0.7));   // the entrance is over at 1

    // placement and copy lane, recomputed only when the canvas resizes
    // or the room above a stacked hero's copy changes
    const { width, height } = state.size;
    if (r.lw !== width || r.lh !== height || r.lroom !== room) {
      r.lw = width;
      r.lh = height;
      r.lroom = room;
      r.aspect = width / Math.max(1, height);
      r.pl = logoPlacement(r.aspect, height, room);
      r.layout = stageLayout(width, r.aspect, height, room);
    }
    const pl = r.pl;
    const L = r.layout;

    // the mark, squared up toward the viewer. Sway and pointer together
    // turn it by at most 0.255 (0.07 + 0.025 + 0.16) either way.
    const P = r.pointer;
    const sway = still ? 0 : 0.07 * Math.sin(0.31 * t) + 0.025 * Math.sin(0.83 * t + 1.3);
    const nod = still ? 0 : 0.03 * Math.sin(0.23 * t + 0.7);
    const bob = still ? 0 : 0.05 * Math.sin(0.4 * t);
    const turn = yaw ? clamp01(yaw.get()) * 0.5 : 0;
    const m = r.mark;
    m.position.set(pl.x, pl.y + bob, 0);
    m.rotation.set(-0.04 + nod + P.y * 0.1, POSE.yaw - 0.14 + sway + P.x * 0.16 + turn, 0);
    m.scale.setScalar(pl.scale * (0.94 + 0.06 * smooth(r.reveal)) * 1.03);
    m.updateMatrix();

    // the copy lane: grains behind the copy are dimmed so it always reads
    r.lane.set(L.lane[0], L.lane[1] >= 1 ? 2 : L.lane[1], L.lane[2], 0.5);

    // light. Phones dim the mark by light, never by transparency.
    r.mat.env = 1.15 * (pl.alpha ?? 1);

    // an idle glint every 11s (never in reduced motion), fading with the
    // idle clock so a glint never stops on the mark
    const gk = (t % 11) / 11;
    if (!still && gk < 0.16) {
      r.sweep = -0.2 + 1.4 * (gk / 0.16);
      r.sweepAmt = 0.45 * Math.sin((Math.PI * gk) / 0.16) * rate;
    } else {
      r.sweep = -1;
      r.sweepAmt = 0;
    }
    r.envRot = still ? 0 : 0.3 * Math.sin(t * ((2 * Math.PI) / 26));   // sways, never spins the light away

    // at rest: the idle clock stopped and the pointer settled — nothing
    // left to draw until the next input
    if (
      !still && !r.resting && r.idle === 0 &&
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
   with it). */
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
   hover only: never on touch or in reduced motion. */
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
