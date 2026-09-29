/*
  JS mirror of the CSS tokens (src/styles/tokens.css) that scripts need:
  the breakpoint scale, media queries and easing curves. CSS uses
  `(max-width: BP.x)` for "at or below"; JS uses the exact negation of
  that query for "above", so the two can never disagree — not even at a
  fractional width such as 860.5px in a zoomed window.
*/
export const BP = {
  phone: 560,    // one column, tightest gutters
  tablet: 860,   // gutters halve, grids collapse, sticky stages relax
  desktop: 1080, // two-column splits stack
  wide: 1580,    // room for the fixed contents rail beside the column
};

export const MQ = {
  aboveTablet: `not all and (max-width: ${BP.tablet}px)`,
  aboveDesktop: `not all and (max-width: ${BP.desktop}px)`,
  wide: `(min-width: ${BP.wide}px)`,
  // "at or below" — identical to the CSS queries
  phone: `(max-width: ${BP.phone}px)`,
  tabletDown: `(max-width: ${BP.tablet}px)`,
  desktopDown: `(max-width: ${BP.desktop}px)`,
  // the process stack pins only when a row fits under its pin line
  tall: "(min-height: 561px)",
  fine: "(hover: hover) and (pointer: fine)",
  coarse: "(pointer: coarse)",
  reduced: "(prefers-reduced-motion: reduce)",
};

/* --ease and --ease-in-out as cubic-bezier arrays for framer-motion */
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
