import { useEffect, useRef } from "react";
import { m, frame, cancelFrame } from "framer-motion";
import { usePageProgress } from "../motion/scroll.js";
import { useMedia, useReducedMotion } from "../motion/prefs.js";
import { MQ } from "../motion/tokens.js";

/* The shell's fixed layers and close: the reading-progress hairline,
   the cursor spotlight and the footer. */

/* Gold hairline that fills as the reader moves through the page. It is
   scroll-linked only, so it stays under reduced motion. framer measures
   on scroll and window resize; a page that grows or shrinks in place
   (a lazy page arriving, late web fonts) is caught by the ResizeObserver. */
export function Progress() {
  const p = usePageProgress();
  useEffect(() => {
    if (typeof ResizeObserver !== "function") return;
    const root = document.documentElement;
    const sync = () => {
      const max = root.scrollHeight - root.clientHeight;
      p.set(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [p]);
  return (
    <div className="progress" aria-hidden="true">
      <m.div className="progress-bar" style={{ scaleX: p }} />
    </div>
  );
}

/* Whether a surface reads as espresso: the nearest flow panel or band
   decides (a paper blueprint panel inside a dark chapter is paper).
   null: no surface there to judge by. (The cursor spotlight's test.) */
function surfaceTone(el) {
  const s = el?.closest?.(".flow-panel, .band");
  if (!s) return null;
  return (s.classList.contains("flow-panel") ? !s.classList.contains("is-paper") : s.classList.contains("dark")) ? "dark" : "paper";
}

/* Cursor-following warm light, for mouse users with motion allowed.
   One fixed disc moved by transform: a pointer move restyles nothing
   else (custom properties on <html> used to restyle the whole document
   on every move). */
export function Spotlight() {
  const fine = useMedia(MQ.fine);
  const reduced = useReducedMotion();
  const on = fine && !reduced;
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const half = el.offsetWidth / 2;
    let raf = 0;
    let x = 0;
    let y = 0;
    let dark = false;
    let lit = false;
    let seen = false;   // a pointer position exists to probe from
    // The light only shows over espresso: on paper it would sit over the
    // ink and pull the faintest text under 4.5:1. The nearest surface
    // decides (a paper blueprint panel inside a dark chapter is paper);
    // over fixed chrome (the top bar) it rests, rather than light the
    // paper that may lie under the disc.
    const tone = (t) => surfaceTone(t) === "dark";
    const paint = () => {
      raf = 0;
      el.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
      if (dark !== lit) { lit = dark; el.style.opacity = dark ? "1" : "0"; }
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      seen = true;
      dark = tone(e.target);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    // The page can scroll under a still pointer: re-read the surface there
    // in framer's read phase, ahead of its scroll-linked writes (so no
    // forced style flush), and paint in its render phase.
    const probe = () => {
      dark = tone(document.elementFromPoint(x, y));
      frame.render(paint);
    };
    const onScroll = () => { if (seen) frame.read(probe); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      cancelFrame(probe);
      cancelFrame(paint);
    };
  }, [on]);
  return on ? <div className="spotlight" ref={ref} aria-hidden="true" /> : null;
}

/* The close: the sign-off and the mark. Its height is published as
   --footer-h, so the landing's closing band and the footer together
   fill the last screen. */
export function Footer() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver !== "function") return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--footer-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <footer className="footer band dark" ref={ref}>
      <div className="wrap">
        <div className="foot-top">
          <p className="foot-state">
            Driven by Purpose. <em className="foil">Powered by Precision.</em>
          </p>
          <span className="brand-logo foot-mark" role="img" aria-label="DataQuin" />
        </div>
      </div>
    </footer>
  );
}
