import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "./prefs.js";

/* One Lenis instance for the whole app, driven by its own frame loop.
   Lenis scrolls the real window, so framer-motion's useScroll and the
   topbar's scroll listener keep working unchanged. Reduced motion:
   no Lenis at all, native scrolling. */

const scroller = { lenis: null };

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

/* The header clearance is one number, `scroll-padding-top` on <html>:
   Lenis reads it when it scrolls to an element, and the native path
   applies it by hand. Nothing else adds an offset. */
function headerClearance() {
  const v = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isFinite(v) ? v : 0;
}

/* Scroll helper that goes through Lenis when it exists and falls back
   to native scrolling otherwise. `target` is a number or an element.
   `immediate` jumps; without Lenis (reduced motion, or before it has
   mounted) every scroll is a jump. */
export function scrollTo(target, { immediate = false } = {}) {
  const l = scroller.lenis;
  if (l) {
    // the page may have just been swapped: refresh the scroll limit
    // before aiming, or a long target clamps at the old page's end
    l.resize();
    l.scrollTo(target, { immediate, duration: immediate ? 0 : 1.1 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "instant" });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY - headerClearance();
    window.scrollTo({ top, behavior: "instant" });
  }
}
