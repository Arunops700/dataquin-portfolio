import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollTo } from "../motion/SmoothScroll.jsx";
import { prefersReducedMotion } from "../motion/prefs.js";
import { focusPageStart, focusSection } from "./focus.js";

/* While a page's chunk is on its way the shell stays: an empty, screen-
   tall placeholder keeps the footer down, and marks the page as pending
   so the scroll code keeps waiting for its sections. */
export const PAGE_PENDING = "page-pending";
const pagePending = () => !!document.querySelector(`.${PAGE_PENDING}`);

/* Where each history entry was read to, so Back and Forward return to
   it. The browser's own restoration is switched off: it would aim
   before the new page has laid out, and against the smooth scroller.
   Kept in sessionStorage, so a reload or a return from another site
   finds it too. An entry with no router state (the first page of a
   visit) has the key "default"; it is filed by its address instead. */
if (typeof history !== "undefined" && "scrollRestoration" in history) history.scrollRestoration = "manual";
const SCROLLS = "dq:scroll";
const entryKey = (loc) => (loc.key && loc.key !== "default" ? loc.key : `@${loc.pathname}${loc.search}${loc.hash}`);
function readScrolls() {
  try { return JSON.parse(sessionStorage.getItem(SCROLLS)) || {}; } catch { return {}; }
}
function saveScroll(key, y) {
  try {
    const all = readScrolls();
    delete all[key]; // re-filed last, so the oldest entries drop first
    all[key] = Math.round(y);
    const keys = Object.keys(all);
    for (let i = 0; i < keys.length - 50; i++) delete all[keys[i]];
    sessionStorage.setItem(SCROLLS, JSON.stringify(all));
  } catch { /* storage blocked or full: Back opens at the top instead */ }
}
/* The first load returns to an offset only when the browser came back
   to the entry (a reload, Back from another site), never on a fresh visit */
function returningLoad() {
  const t = performance.getEntriesByType?.("navigation")?.[0]?.type;
  return t === "reload" || t === "back_forward";
}

/* The section a restored offset shows, read from layout (a glide may
   still be under way): the one holding the reader's eye line, 35% down
   the viewport, at offset y */
function sectionAt(y) {
  const line = y + document.documentElement.clientHeight * 0.35;
  for (const sec of document.querySelectorAll("main section")) {
    const top = sec.getBoundingClientRect().top + window.scrollY;
    if (line >= top && line < top + sec.offsetHeight) return sec;
  }
  return null;
}

/* Route + hash navigation.
   - A new path starts at the top; the path already open glides back up
     instead. Either way focus moves to the page's h1 (never on the
     first load), so a link at the foot of the page doesn't keep focus
     far below the reader.
   - A hash scrolls to its section once it exists in the DOM (the page
     may still be mounting, or its chunk loading, when the effect first
     runs) and moves focus there, so the next Tab continues from the
     section. A hash that never resolves (a stale link, a typo) still
     opens a new page at its top, not at the old page's offset.
   - Back and Forward return to the offset the entry was left at, once
     the page is tall enough to hold it; focus goes where an arrival
     would put it, without scrolling.
   - A cold deep link re-aims once web fonts arrive (the target moves as
     they swap) — unless the reader has started scrolling meanwhile. */
export function useScrollNavigation() {
  const location = useLocation();
  const navType = useNavigationType();
  const lastPath = useRef(null);
  // the open entry and the reader's last offset in it
  const here = useRef({ key: null, y: 0 });

  useEffect(() => {
    const onScroll = () => { here.current.y = window.scrollY; };
    // leaving the site or reloading files the open entry too
    const onHide = () => { if (here.current.key) saveScroll(here.current.key, window.scrollY); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useLayoutEffect(() => {
    const id = location.hash.slice(1);
    const first = lastPath.current === null;
    // a hash on a freshly mounted page jumps (there is nothing to glide
    // from); a move on the page already open glides
    const newPage = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    // file the entry being left at its last offset (read from the scroll
    // events: the swapped page may already have clamped window.scrollY)
    const at = here.current;
    if (at.key) saveScroll(at.key, at.y);
    at.key = entryKey(location);
    const back = navType === "POP" && (!first || returningLoad()) ? readScrolls()[at.key] : undefined;

    let raf = 0;
    let alive = true;
    // Runs `done` once `ready()` holds, checking each frame. Frames spent
    // while a lazy page is still loading don't count against the budget
    // (capped at ~10s in all); `fail` runs when it is spent.
    const when = (ready, done, fail) => {
      let tries = 0;
      let frames = 0;
      const step = () => {
        if (!alive) return;
        if (ready()) done();
        else if ((pagePending() || tries++ < 30) && frames++ < 600) raf = requestAnimationFrame(step);
        else fail?.();
      };
      step();
    };
    const cleanup = () => { alive = false; cancelAnimationFrame(raf); };

    if (typeof back === "number") {
      // Back / Forward: the entry's own offset, once the page can hold it
      // (the tall landing, a lazy page still loading)
      const root = document.documentElement;
      const go = () => {
        scrollTo(back, { immediate: newPage });
        at.y = window.scrollY;
        if (first) return;
        // focus goes where the reader is put back: the section at the
        // restored offset (the link that had focus has left with the old
        // page, or sits far from the restored view on this one)
        const el = sectionAt(back) || (id && document.getElementById(id));
        if (el) focusSection(el);
        else focusPageStart();
      };
      when(() => !pagePending() && root.scrollHeight - root.clientHeight >= back - 1, go, go);
      return cleanup;
    }

    if (!id) {
      scrollTo(0, { immediate: newPage });
      at.y = window.scrollY;
      // a lazy page's h1 arrives with its chunk
      if (!first) when(() => !pagePending(), focusPageStart, focusPageStart);
      return cleanup;
    }
    if (newPage) scrollTo(0, { immediate: true });
    at.y = window.scrollY;
    const land = () => {
      const el = document.getElementById(id);
      scrollTo(el, { immediate: newPage });
      focusSection(el);
      if (newPage && document.fonts && document.fonts.status !== "loaded") {
        const landed = window.scrollY;
        document.fonts.ready.then(() => {
          // two frames: the swapped layout settles before the aim
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (alive && Math.abs(window.scrollY - landed) < 4) scrollTo(el, { immediate: true });
          }));
        });
      }
    };
    when(() => document.getElementById(id), land, () => {
      if (newPage && !first) focusPageStart(); // a stale hash: the link that had focus is gone
    });
    return cleanup;
  }, [location.pathname, location.hash, location.key, navType]);
}
