import { useEffect, useRef, useState } from "react";

/* ---------- Reveal on scroll (fail-safe: never stays hidden) ---------- */
/* The observer does the work. Two fail-safes cover the cases where it
   never fires (odd viewports, hash jumps, a broken observer): anything
   already inside the viewport is shown after 1.2s, and a scroll
   listener shows an element the moment it is on screen. Elements below
   the fold stay hidden until they arrive, so their entrance plays. */
function onScreen(el, slack = 0) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight + slack && r.bottom > -slack;
}

export function Reveal({ children, as: Tag = "div", delay = 0, className = "", ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      el.classList.add("visible");
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(safety);
    };
    const onScroll = () => { if (onScreen(el, -20)) show(); };
    const safety = setTimeout(() => { if (onScreen(el)) show(); }, 1200);
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) show(); }); },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );
    obs.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); clearTimeout(safety); };
  }, []);
  const d = delay ? ` d${delay}` : "";
  return (
    <Tag ref={ref} className={`reveal${d} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Animated counter ---------- */
export function CountUp({ to, suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(safety);
      // Someone who asked the OS to reduce motion gets the final figure
      // straight away rather than watching it tick up.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setVal(to);
        return;
      }
      let t0 = null;
      const step = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const onScroll = () => { if (onScreen(el, -20)) start(); };
    const safety = setTimeout(() => { if (onScreen(el)) start(); }, 1500);
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) start(); }); },
      { threshold: 0.4 }
    );
    obs.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ---------- Magnetic wrapper for primary CTAs ---------- */
/* The child button leans up to `max` px toward the pointer; CSS on
   `.magnet > .btn` does the actual transform and the spring-back.
   Touch devices and reduced-motion users get the plain children. */
export function Magnetic({ children, strength = 0.16, max = 6 }) {
  const ref = useRef(null);
  const [active] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  if (!active) return children;

  const clamp = (v) => Math.max(-max, Math.min(max, v * strength));
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--magx", clamp(e.clientX - (r.left + r.width / 2)) + "px");
    el.style.setProperty("--magy", clamp(e.clientY - (r.top + r.height / 2)) + "px");
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--magx", "0px");
    el.style.setProperty("--magy", "0px");
  };
  return (
    <span className="magnet" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </span>
  );
}
