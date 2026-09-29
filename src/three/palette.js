/*
  The palette as the 3D scene and the poster need it: plain hex strings
  mirroring src/styles/tokens.css, which stays the source of truth. Every
  colour drawn in GL is one of these or a shade of one.
*/
export const PAL = {
  esp: "#191209",          // --esp: the dark band, and so the canvas ground
  esp2: "#251c11",         // --esp-2
  paper: "#f6f0e3",        // --paper: the studio's light cards
  gold: "#a5824f",         // --gold: the mark's metal
  goldHi: "#d8bc8a",       // --gold-hi
  goldSoft: "#b39877",     // --gold-soft: resting grains
  goldMid: "#d3b789",      // --gold-mid
  champagne: "#f0e0c2",    // --champagne
  champagneHi: "#f6ead0",  // --champagne-hi: lit grains, the reveal edge, key light
  bronze: "#8a6c49",       // --bronze
};
