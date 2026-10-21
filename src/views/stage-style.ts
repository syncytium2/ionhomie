// stage-style.ts — the cell stage's own literal colors and sizes, in one place, so everything that draws
// the stage (src/views/draw.ts, and scripts/tile-svg.ts for the tonydefazio.com tile) reads the same
// values and cannot drift. The ion colors are CSS variables in src/styles.css; the tile script reads
// them from there.
// DOWNSTREAM: tonydefazio.com inlines a copy of the tile this feeds (site 1.11.1, from 5c225e6). It does not
// update itself: if a change here alters the tile's look, regenerate it and tell the tonydefazio.com session.
/** Bulk dots per mM per 1000 px², inside and out (docs/adr/0011). */
export const DOT_DENSITY = 0.0062;
/** Ions of membrane charge per drawn ± (docs/adr/0011). */
export const IONS_PER_SIGN = 1.1e5;

export const STAGE = {
  bath: "#101826", // the bath, and the dark gap in a channel, and the label outline
  cyto: "#1a1626", // the cytoplasm
  rimPlus: "#ffb4a2", // a + of membrane charge
  rimMinus: "#9ad1ff", // a − of membrane charge
  pump: "#b9a3ff", // the Na⁺/K⁺-ATPase
  off: "#3a3a3a", // a pump or transporter that is not running
  nkcc1: "#7fb069",
  kcc2: "#e07a5f",
  membraneWidth: 8, // px, drawn at 0.9 opacity
  dotR: 2.8, // a bulk dot (cations' and anions' size parameter)
  aR: 3.4, // an A⁻ dot
  crossR: 3.6, // a dot crossing a pathway
  rimR: 9, // the ± rim sits this far either side of the membrane
} as const;
