import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "./prefs.js";

/* One Lenis instance for the whole app, driven by its own frame loop.
   Lenis scrolls the real window, so framer-motion's useScroll and the
   topbar's scroll listener keep working unchanged. Reduced motion:
   no Lenis at all, native scrolling. */

export const scroller = { lenis: null };

export function SmoothScroll({ children }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
    });
    scroller.lenis = lenis;
    return () => {
      lenis.destroy();
      scroller.lenis = null;
    };
  }, [reduced]);

  return children;
}

/* Scroll helper that goes through Lenis when it exists and falls back
   to native scrolling otherwise. `target` is a number or an element. */
export function scrollTo(target, { offset = 0, immediate = false } = {}) {
  const l = scroller.lenis;
  if (l) {
    l.scrollTo(target, { offset, immediate, duration: immediate ? 0 : 1.1 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: immediate ? "instant" : "smooth" });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
  }
}
