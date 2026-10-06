/*
  JS mirror of the CSS tokens (src/styles/tokens.css) that scripts need:
  the breakpoint, media queries and easing curve. CSS uses
  `(max-width: BP.x)` for "at or below"; JS uses the exact negation of
  that query for "above", so the two can never disagree — not even at a
  fractional width such as 860.5px in a zoomed window.
*/
export const BP = {
  tablet: 860,   // gutters halve, grids collapse, sticky stages relax
};

export const MQ = {
  aboveTablet: `not all and (max-width: ${BP.tablet}px)`,
  fine: "(hover: hover) and (pointer: fine)",
  coarse: "(pointer: coarse)",
};

/* --ease-in-out as a cubic-bezier array for framer-motion */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
