import { useEffect, useRef, useState } from "react";

/* ---------- Reveal on scroll (fail-safe: never stays hidden) ---------- */
export function Reveal({ children, as: Tag = "div", delay = 0, className = "", ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fail-safe: if the observer never fires (edge cases, hash jumps,
    // odd viewports), force the content visible after 1.2s.
    const safety = setTimeout(() => el.classList.add("visible"), 1200);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(safety); };
  }, []);
  const d = delay ? ` d${delay}` : "";
  return (
    <Tag ref={ref} className={`reveal${d} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Animated counter ---------- */
export function CountUp({ to, suffix = "", prefix = "", duration = 1600 }) {
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
    const safety = setTimeout(start, 1500); // fail-safe
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            start();
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

/* ---------- Panel with cursor glow ---------- */
export function Panel({ children, className = "", ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", e.clientX - r.left + "px");
    ref.current.style.setProperty("--my", e.clientY - r.top + "px");
  };
  return (
    <div ref={ref} className={`panel ${className}`} onMouseMove={onMove} {...rest}>
      {children}
    </div>
  );
}
