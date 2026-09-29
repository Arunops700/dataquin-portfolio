import { useEffect, useRef } from "react";
import { TECH } from "../../data/site.js";
import { useReducedMotion } from "../../motion/prefs.js";

/* The stack as a sphere of tool tiles — CSS 3D, no second WebGL context
   (the page's hero already holds one). Tiles sit on a Fibonacci sphere
   and are projected by hand each frame: a transform and an opacity per
   tile, nothing that lays out.

   - Turns slowly on its own for its first few seconds on screen, then
     eases to a stop (nothing moves by itself past ~5s); drag (mouse or
     touch) spins it, with a little inertia. Once the reader has dragged
     or pointed, it never drifts again.
   - Speeds are per 60fps frame, scaled by the real frame time, so a
     120Hz screen turns it no faster.
   - `hot` (a TECH index, or -1): the ledger beside it points at a tool,
     and the sphere turns that tile to the front and lights it.
   - Reduced motion: no drift and no glide — a still sphere that turns
     only when dragged, and snaps to the tool that's pointed at.
   - Decorative: the ledger carries every name, so this is aria-hidden. */

const N = TECH.length;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const PTS = TECH.map((_, i) => {
  const y = 1 - (2 * (i + 0.5)) / N;
  const r = Math.sqrt(1 - y * y);
  return [Math.cos(GOLDEN * i) * r, y, Math.sin(GOLDEN * i) * r];
});
const TILT = -0.28;        // resting tilt toward the reader (radians)
const DRIFT = 0.0022;      // auto-turn per frame at 60fps
const DRIFT_MS = 4000;     // on-screen time at full drift…
const EASE_MS = 1200;      // …then it eases to a stop
const FRAME = 1000 / 60;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // to (-π, π]

export function TechSphere({ hot = -1 }) {
  const box = useRef(null);
  const tiles = useRef([]);
  const still = useReducedMotion();
  // life: ms of drift spent (Infinity once it is over, or taken over)
  const st = useRef({ rx: TILT, ry: 0.4, vx: 0, vy: 0, drag: null, goal: null, R: 160, on: false, raf: 0, last: 0, life: 0 });

  useEffect(() => {
    const el = box.current;
    const s = st.current;
    if (!el) return undefined;

    const paint = () => {
      const cx = Math.cos(s.rx), sx = Math.sin(s.rx), cy = Math.cos(s.ry), sy = Math.sin(s.ry);
      for (let i = 0; i < N; i++) {
        const t = tiles.current[i];
        if (!t) continue;
        const [x, y, z] = PTS[i];
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;                 // -1 (back) … 1 (front)
        const d = (z2 + 1) / 2;
        t.style.transform = `translate3d(${(x1 * s.R).toFixed(1)}px, ${(y2 * s.R).toFixed(1)}px, 0) scale(${(0.5 + 0.5 * d).toFixed(3)})`;
        t.style.opacity = (0.22 + 0.78 * d).toFixed(3);
        t.style.zIndex = String(Math.round(d * 100));
      }
    };

    if (still) s.life = Infinity;

    const tick = (now) => {
      s.raf = 0;
      // elapsed time in 60fps frames (capped: a stalled frame never leaps)
      const f = s.last ? Math.min(now - s.last, 64) / FRAME : 1;
      s.last = now;
      let moving = false;
      if (s.drag) {
        moving = true;
      } else if (s.goal) {
        const dy = wrap(s.goal.ry - s.ry);
        const dx = s.goal.rx - s.rx;
        const k = 1 - Math.pow(0.88, f);
        s.ry += dy * k;
        s.rx += dx * k;
        moving = Math.abs(dy) > 0.002 || Math.abs(dx) > 0.002;
      } else {
        // inertia after a drag; the opening drift fades out after DRIFT_MS
        s.life += f * FRAME;
        const e = Math.min(1, Math.max(0, (s.life - DRIFT_MS) / EASE_MS));
        const amt = (1 - e) * (1 - e);
        s.vy *= Math.pow(0.94, f);
        s.vx *= Math.pow(0.9, f);
        s.ry += (s.vy + DRIFT * amt) * f;
        s.rx += s.vx * f + (TILT - s.rx) * (1 - Math.pow(0.98, f)) * amt;
        moving = amt > 0 || Math.abs(s.vy) > 0.0005 || Math.abs(s.vx) > 0.0005;
      }
      paint();
      if (moving && s.on) s.raf = requestAnimationFrame(tick);
      else s.last = 0;
    };
    const kick = () => {
      if (s.raf || !s.on) return;
      s.last = 0; // the first frame after a pause counts as one frame
      s.raf = requestAnimationFrame(tick);
    };
    s.kick = kick;

    const measure = () => {
      s.R = Math.max(90, Math.min(el.clientWidth, el.clientHeight) * 0.4);
      paint();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // only while on screen, and not in a hidden tab
    let seen = false;
    const sync = () => {
      s.on = seen && !document.hidden;
      if (s.on) kick(); else { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(el);
    const onVis = sync;
    document.addEventListener("visibilitychange", onVis);

    // the primary button or finger only; the reader takes over for good
    const down = (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      s.goal = null;
      s.life = Infinity;
      el.setPointerCapture?.(e.pointerId);
      kick();
    };
    const move = (e) => {
      if (!s.drag || e.pointerId !== s.drag.id) return;
      const dx = e.clientX - s.drag.x;
      const dy = e.clientY - s.drag.y;
      // the turn follows the pointer; the velocity is kept per 60fps frame
      const f = Math.max(4, e.timeStamp - s.drag.t) / FRAME;
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      s.vy = (dx * 0.006) / f;
      s.vx = (dy * 0.006) / f;
      s.ry += dx * 0.006;
      s.rx = Math.max(-1.1, Math.min(1.1, s.rx + dy * 0.006));
      if (still) paint();
    };
    // under reduced motion a drag stops where it is let go: no glide.
    // Lost capture ends it too, so a drag can never stay stuck on.
    const up = (e) => {
      if (!s.drag || e.pointerId !== s.drag.id) return;
      s.drag = null;
      if (still) { s.vx = 0; s.vy = 0; }
      kick();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.last = 0;
      s.drag = null;
    };
  }, [still]);

  // the tool pointed at in the ledger turns to the front
  useEffect(() => {
    const s = st.current;
    if (hot < 0) { s.goal = null; s.kick?.(); return; }
    const [x, y, z] = PTS[hot];
    const ry = Math.atan2(-x, z);
    const z1 = Math.hypot(x, z);
    const rx = Math.atan2(y, z1);
    s.goal = { rx, ry };
    s.life = Infinity; // pointed at: no drift afterwards
    s.vx = 0;
    s.vy = 0;
    if (still) { s.rx = rx; s.ry = ry; s.goal = null; }
    s.kick?.();
  }, [hot, still]);

  return (
    <div className="tsp" ref={box} aria-hidden="true">
      <div className="tsp-core">
        {TECH.map((t, i) => (
          <span key={t.name} className={`tsp-tile${hot === i ? " hot" : ""}`} ref={(n) => { tiles.current[i] = n; }}>
            <img src={`/icons/${t.ico}`} alt="" loading="lazy" draggable="false" />
            <span className="tsp-name">{t.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
