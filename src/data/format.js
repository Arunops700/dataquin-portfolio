/* Small text helpers for copy that is derived from data. This file
   imports nothing, so anything (site.js included) can use it. */
const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three",
  "twenty-four", "twenty-five",
];

/* 6 → "six"; numbers past the table fall back to digits */
export const countWord = (n) => WORDS[n] ?? String(n);
/* "six" → "Six" */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/* 3 → "03" */
export const pad2 = (n) => String(n).padStart(2, "0");
