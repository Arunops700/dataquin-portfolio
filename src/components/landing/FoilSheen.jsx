import { useEffect } from "react";
import { m, animate, useMotionValue, useTransform } from "framer-motion";
import { useReducedMotion } from "../../motion/prefs.js";
import { EASE_IN_OUT } from "../../motion/tokens.js";

/* Foil emphasis whose highlight travels with the reader: as `progress`
   runs through `range`, the light crosses the phrase (30% → 100% of
   the .foil.shine gradient). The text itself is always fully opaque —
   only the highlight moves, so every resting position is finished.
   `intro` adds a one-off sweep into the resting 30% on load, when
   motion is allowed; framer's animate() is not gated by MotionConfig,
   so reduced motion is checked here. Replaces the old ambient loop. */
export default function FoilSheen({ progress, range = [0, 1], intro = false, children }) {
  const reduced = useReducedMotion();
  const lit = useMotionValue(intro && !reduced ? 0 : 1);

  useEffect(() => {
    if (!intro || reduced) {
      lit.set(1);
      return;
    }
    lit.set(0);
    const c = animate(lit, 1, { duration: 2.4, delay: 1.1, ease: EASE_IN_OUT });
    return () => c.stop();
  }, [intro, reduced, lit]);

  const [a, b] = range;
  const pos = useTransform([lit, progress], ([l, v]) => {
    const s = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return `${30 * l + 70 * s}% center`;
  });

  return <m.em className="foil shine" style={{ backgroundPosition: pos }}>{children}</m.em>;
}
