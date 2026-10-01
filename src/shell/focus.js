/* Where keyboard focus goes when the view changes under the reader. */

/* Moves keyboard focus to the start of the page — its h1, else <main> —
   without scrolling, so the next Tab continues from the top of the new
   content rather than from a topbar link (or from nothing, once the
   link that had focus has been unmounted). The h1 is announced, too. */
export function focusPageStart() {
  const main = document.getElementById("main");
  if (!main) return;
  const h = main.querySelector("h1");
  if (h) {
    if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
    if (document.activeElement === h) return; // an inert heading refuses focus
  }
  main.focus({ preventScroll: true });
}

/* Focus on a landed section's heading: a focused section can be read
   out whole by a screen reader (the cue still marks the section) */
export function focusSection(el) {
  const head = el.matches("section, article") ? el.querySelector("h1, h2, h3") : null;
  const target = head || el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (head && document.activeElement !== head) { // an inert heading refuses focus
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}
