import { useEffect } from "react";
import Lenis from "lenis";
import { useMedia, useReducedMotion, prefersReducedMotion } from "./prefs.js";
import { MQ } from "./tokens.js";

/* One Lenis instance for the whole app, driven by its own frame loop.
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
  }, [reduced, coarse]);

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
   `immediate` jumps. Without Lenis the browser glides (touch screens),
   and under reduced motion every scroll is a jump. */
export function scrollTo(target, { immediate = false } = {}) {
  const l = scroller.lenis;
  if (l) {
    // the page may have just been swapped: refresh the scroll limit
    // before aiming, or a long target clamps at the old page's end
    l.resize();
    l.scrollTo(target, { immediate, duration: immediate ? 0 : 1.1 });
    return;
  }
  const behavior = immediate || prefersReducedMotion() ? "instant" : "smooth";
  const top = typeof target === "number"
    ? target
    : target.getBoundingClientRect().top + window.scrollY - headerClearance();
  window.scrollTo({ top, behavior });
}
