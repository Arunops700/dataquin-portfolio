import { useScroll, useMotionValue, useMotionValueEvent } from "framer-motion";

/*
  Scroll progress as plain MotionValues. Bind styles ONLY to values
  from this file, never to raw useScroll() output:

  framer-motion's useScroll hands scroll-linked opacity to the browser's
  native ViewTimeline whenever the offsets map to a named range. For
  tall sticky stages Chrome's ViewTimeline progress and the JavaScript
  progress disagree, and elements end up driven by the wrong number.
  Copying the progress into a fresh MotionValue drops the acceleration
  flag, so every transform derived from it runs on the JS path and
  agrees with what the reader sees.
*/

/* Progress through one section (0 → 1). */
export function useProgress(target, offset = ["start start", "end end"]) {
  const { scrollYProgress } = useScroll({ target, offset });
  const p = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => p.set(v));
  return p;
}

/* Progress through the whole page (0 → 1), on framer's one shared
   window listener. */
export function usePageProgress() {
  const { scrollYProgress } = useScroll();
  const p = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => p.set(v));
  return p;
}

/* Odometer keyframes for useTransform: rests on whole steps and rolls
   at each switch point. `edges` are ascending switch points in the
   driver's units; each roll takes `half` either side. The output is a %
   of the list's own height (n lines), so it survives text zoom and
   needs no shared line-height constant. Pair with .roll / .roll-list
   (type.css). Input stays strictly ascending (a framer requirement). */
export function stepRoll(edges, half, lo, hi) {
  const n = edges.length + 1;
  const at = (i) => `${(-i * 100) / n}%`;
  const input = [lo];
  const output = [at(0)];
  edges.forEach((e, i) => {
    input.push(e - half, e + half);
    output.push(at(i), at(i + 1));
  });
  input.push(hi);
  output.push(at(edges.length));
  return [input, output];
}
