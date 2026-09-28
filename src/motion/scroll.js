import { useScroll, useMotionValue, useMotionValueEvent } from "framer-motion";

/*
  Scroll progress for a section, as a plain MotionValue.

  framer-motion's useScroll hands scroll-linked opacity to the browser's
  native ViewTimeline whenever the offsets map to a named range. For
  tall sticky stages Chrome's ViewTimeline progress and the JavaScript
  progress disagree, and elements end up driven by the wrong number.
  Copying the progress into a fresh MotionValue drops the acceleration
  flag, so every transform derived from it runs on the JS path and
  agrees with what the reader sees.
*/
export function useProgress(target, offset = ["start start", "end end"]) {
  const { scrollYProgress } = useScroll({ target, offset });
  const p = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => p.set(v));
  return p;
}
