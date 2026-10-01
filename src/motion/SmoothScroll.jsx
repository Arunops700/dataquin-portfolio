import { useEffect } from "react";
import Lenis from "lenis";
import { frame, cancelFrame } from "framer-motion";
import { useMedia, useReducedMotion, prefersReducedMotion } from "./prefs.js";
import { MQ } from "./tokens.js";

/* One Lenis instance for the whole app, stepped by framer-motion's own
   frame loop (not a second requestAnimationFrame loop), so the smoothed
   scroll and every scroll-linked style advance together, frame by frame.
   Lenis scrolls the real window, so framer-motion's useScroll (and
   everything built on it: progress, topbar, scroll-linked styles) keeps
   working unchanged. Reduced motion: no Lenis at all, native scrolling.
   Touch screens: none either — Lenis leaves touch scrolling native
   anyway, and would only add blocking touch listeners (a busy main
   thread would hold up the first swipe) and a frame loop that never
   stops; their glides use the browser's own smooth scroll. */

const scroller = { lenis: null };

export function SmoothScroll({ children }) {
  const reduced = useReducedMotion();
  const coarse = useMedia(MQ.coarse);

  useEffect(() => {
    if (reduced || coarse) return;
    const lenis = new Lenis({
      lerp: 0.1,              // Lenis' own default: smooth, but settles promptly
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });
    const step = ({ timestamp }) => lenis.raf(timestamp);
    frame.update(step, true);   // every frame, in framer's update phase
    scroller.lenis = lenis;
    return () => {
      cancelFrame(step);
      lenis.destroy();
      scroller.lenis = null;
    };
  }, [reduced, coarse]);

  return children;
}

/* Where an element lands: the header clearance (`scroll-padding-top` on
   <html>, one number for the whole site) plus the element's own
   `scroll-margin-top`, as the browser's native anchor scrolling counts
   them. A one-screen landing section sets a negative margin that cancels
   the clearance: its own top padding already clears the bar. Both paths
   below aim at this one number. */
const px = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
function landingTop(el) {
  const clearance = px(getComputedStyle(document.documentElement).scrollPaddingTop);
  const margin = px(getComputedStyle(el).scrollMarginTop);
  return el.getBoundingClientRect().top + window.scrollY - clearance - margin;
}

/* Scroll helper that goes through Lenis when it exists and falls back
   to native scrolling otherwise. `target` is a number or an element.
   `immediate` jumps. Without Lenis the browser glides (touch screens),
   and under reduced motion every scroll is a jump. */
export function scrollTo(target, { immediate = false } = {}) {
  const l = scroller.lenis;
  if (l) {
    // the page may have just been swapped: refresh the scroll limit
    // before aiming, or a long target clamps at the old page's end
    l.resize();
    const top = typeof target === "number" ? target : landingTop(target);
    l.scrollTo(top, { immediate, duration: immediate ? 0 : 1.1 });
    return;
  }
  const behavior = immediate || prefersReducedMotion() ? "instant" : "smooth";
  const top = typeof target === "number" ? target : landingTop(target);
  window.scrollTo({ top, behavior });
}
