import { useEffect, useRef } from "react";
import { MQ } from "../motion/tokens.js";
import { useMedia, useReducedMotion, prefersReducedMotion } from "../motion/prefs.js";

/* ---------- Shared "has it entered the screen?" watcher ---------- */
/* Every Reveal registers here instead of wiring its own
   observer and scroll listener. One IntersectionObserver per option set
   does the work; two fail-safes cover the cases where it never fires
   (odd viewports, hash jumps, a broken observer):
   - one passive scroll/resize listener — bound only while something is
     still waiting — sweeps once the scrolling pauses (a backstop needs
     no per-frame reads) and shows any element that is on screen;
   - a per-element safety timer shows an element that is already inside
     the viewport after `safety` ms.
   Elements below the fold stay hidden until they arrive, so their
   entrance plays; nothing
   can stay invisible once it is on screen. With reduced motion, no
   observer is created at all: content is shown at once. */
function onScreen(el, inset = 0) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight - inset && r.bottom > inset
      && r.left < window.innerWidth && r.right > 0;
}

const waiting = new Map(); // element -> { cb, io, timer }
const observers = new Map(); // "threshold|rootMargin" -> IntersectionObserver
let bound = false;
let pause = 0; // the sweep's timer: 150ms after the last scroll or resize

/* Two phases: every rect is read before any callback writes, so a sweep
   past many waiting elements costs one layout, not one each. */
function sweep() {
  pause = 0;
  const due = [];
  for (const el of waiting.keys()) if (onScreen(el, 20)) due.push(el);
  due.forEach(fire);
}
function onScroll() {
  clearTimeout(pause);
  pause = setTimeout(sweep, 150);
}

function release(el) {
  const w = waiting.get(el);
  if (!w) return;
  waiting.delete(el);
  w.io.unobserve(el);
  clearTimeout(w.timer);
  if (!waiting.size && bound) {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    bound = false;
    if (pause) { clearTimeout(pause); pause = 0; }
  }
}
function fire(el) {
  const w = waiting.get(el);
  if (!w) return;
  release(el);
  w.cb();
}

function observerFor(threshold, rootMargin) {
  const key = `${threshold}|${rootMargin}`;
  let io = observers.get(key);
  if (!io) {
    io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) fire(e.target); }),
      { threshold, rootMargin }
    );
    observers.set(key, io);
  }
  return io;
}


/* Calls `cb` once, the first time `el` is on screen. Returns a cleanup. */
function whenOnScreen(el, cb, { threshold = 0.05, rootMargin = "0px 0px -20px 0px", safety = 1200 } = {}) {
  if (!el) return () => {};
  if (typeof IntersectionObserver !== "function" || prefersReducedMotion()) {
    cb();
    return () => {};
  }
  try {
    release(el);
    const io = observerFor(threshold, rootMargin);
    const timer = setTimeout(() => { if (onScreen(el)) fire(el); }, safety);
    waiting.set(el, { cb, io, timer });
    io.observe(el);
    if (!bound) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      bound = true;
    }
  } catch (err) {
    // any setup failure: show the content rather than risk a blank page
    console.error("Reveal watcher failed; showing content.", err);
    waiting.delete(el);
    cb();
    return () => {};
  }
  return () => release(el);
}

/* ---------- Reveal on scroll (fail-safe: never stays hidden) ---------- */
/* The revealed state is the `data-in` attribute, which React does not
   manage — a re-render that changes className can never hide it again.
   Style against `.reveal[data-in]` (or `.x[data-in]`), never a class. */
export function Reveal({ children, as: Tag = "div", delay = 0, className = "", ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return whenOnScreen(el, () => el.setAttribute("data-in", ""));
  }, []);
  const d = delay ? ` d${delay}` : "";
  return (
    <Tag ref={ref} className={`reveal${d} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* An email address that may wrap after its @, never inside a name. Its
   own span, so in a flex parent the <wbr> can't become a flex item. */
export function Email({ address }) {
  const at = address.indexOf("@");
  if (at < 0) return <span>{address}</span>;
  return <span>{address.slice(0, at + 1)}<wbr />{address.slice(at + 1)}</span>;
}

/* ---------- Magnetic wrapper for primary CTAs ---------- */
/* The child button leans up to `max` px toward a mouse pointer; the
   transform itself is `.btn`'s (it reads --magx/--magy), so hover lift,
   press and the lean never fight. One layout read per frame at most.
   The wrapper always renders (layout rules such as `.cta-band .magnet`
   depend on it); touch, pen and reduced-motion users get no handlers,
   so the button simply stays put. Preferences are live. */
export function Magnetic({ children, strength = 0.16, max = 6 }) {
  const fine = useMedia(MQ.fine);
  const reduced = useReducedMotion();
  const active = fine && !reduced;
  const ref = useRef(null);
  const st = useRef({ x: 0, y: 0, on: false, raf: 0 });

  useEffect(() => {
    const s = st.current;
    const el = ref.current;
    if (!active && el) {
      el.style.removeProperty("--magx");
      el.style.removeProperty("--magy");
    }
    return () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [active]);

  const clamp = (v) => Math.max(-max, Math.min(max, v * strength));
  const paint = () => {
    const s = st.current;
    s.raf = 0;
    const el = ref.current;
    if (!el) return;
    let x = 0;
    let y = 0;
    if (s.on) {
      const r = el.getBoundingClientRect();
      x = clamp(s.x - (r.left + r.width / 2));
      y = clamp(s.y - (r.top + r.height / 2));
    }
    el.style.setProperty("--magx", `${x}px`);
    el.style.setProperty("--magy", `${y}px`);
  };
  const queue = () => { if (!st.current.raf) st.current.raf = requestAnimationFrame(paint); };
  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    Object.assign(st.current, { x: e.clientX, y: e.clientY, on: true });
    queue();
  };
  const onLeave = () => { st.current.on = false; queue(); };

  return (
    <span className="magnet" ref={ref}
      onPointerMove={active ? onMove : undefined} onPointerLeave={active ? onLeave : undefined}>
      {children}
    </span>
  );
}
