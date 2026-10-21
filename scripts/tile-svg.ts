// tile-svg.ts — ionhomie's tile figure for tonydefazio.com: the home page's living cell, drawn as the
// stage draws it, as one self-contained, script-free, animated SVG.
//
//   node scripts/tile-svg.ts > tile.svg
//
// Looks: the stage's own constants (src/views/stage-style.ts, which src/views/draw.ts draws with) and the
// ion colors read from src/styles.css, so the tile cannot drift from the site.
// Motion: every crossing is the model's (src/core/physics.ts) one-way flux at the healthy steady state,
// in proportion to one pump cycle per loop, so the loop is a true steady state.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import * as I from "../src/core/physics.ts";
import { DOT_DENSITY, IONS_PER_SIGN, STAGE } from "../src/views/stage-style.ts";

// the stylesheet's own variables
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const v = (name: string) => { const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css); if (!m) throw new Error(`no ${name} in styles.css`); return m[1]; };
const COL = { na: v("--na"), k: v("--k"), cl: v("--cl"), a: v("--a"), membrane: v("--membrane"), text: v("--text"), bg: v("--bg") };

const W = 420, H = 210, CX = 210, CY = 104, R = 64, LOOP = 12;
const K_SCALE = 1.35; // the stage's pathway scale at this cell size (k = 1)
const CROSS_R = 4.2; // a crossing dot: the stage draws 3.6; larger here so it reads on a phone
const RIM_EVERY = 2; // every other ± (the tile's cell is small): each sign ≈ 2 × IONS_PER_SIGN ions

const h = I.healthyState(), s = I.snapshot(h.cell, h.n);
const oneWay = (ion: "K" | "Na" | "Cl") => { const u = I.ghkUnidirectional(h.cell.P[ion], I.ION_Z[ion], s.V, s.ci[ion], I.BATH[ion]); return { out: u.efflux * s.area, in: u.influx * s.area }; };
const cnt = (x: number) => Math.round(x / s.pump); // per loop, at one pump cycle per loop
const K = oneWay("K"), Na = oneWay("Na"), Cl = oneWay("Cl");
const n = { Kout: cnt(K.out), Kin: cnt(K.in), Naout: cnt(Na.out), Nain: cnt(Na.in), Cl: Math.min(cnt(Cl.out), 3) };
const clFrac = cnt(Cl.out) / n.Cl;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (x: number) => +x.toFixed(1);
const at = (rad: number, r: number) => [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];

// glyphs, as src/views/draw.ts glyph() draws them
const dot = (cls: string, x: number, y: number, r: number) => {
  if (cls === "cl") return `<path class="cl" d="M${f(x)} ${f(y - r * 1.25)}L${f(x + r * 1.25)} ${f(y)}L${f(x)} ${f(y + r * 1.25)}L${f(x - r * 1.25)} ${f(y)}Z"/>`;
  if (cls === "a") { const k = 1.7; return `<path class="a" d="M${f(x - r * k)} ${f(y)}Q${f(x - r * k)} ${f(y - r * k)} ${f(x)} ${f(y - r * 0.9)}Q${f(x + r * k)} ${f(y - r * k)} ${f(x + r * k)} ${f(y)}Q${f(x + r * k)} ${f(y + r * k)} ${f(x)} ${f(y + r * 0.9)}Q${f(x - r * k)} ${f(y + r * k)} ${f(x - r * k)} ${f(y)}Z"/>`; }
  return `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
};
const bathAt = () => { for (;;) { const x = 6 + rnd() * (W - 12), y = 6 + rnd() * (H - 12); if (Math.hypot(x - CX, y - CY) > R + 12) return [x, y]; } };
const cellAt = () => { const a = rnd() * 2 * Math.PI, r = (R - 10) * Math.sqrt(rnd()); return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; };
// dots at the stage's density: DOT_DENSITY dots per mM per 1000 px², inside and out
const bathArea = W * H - Math.PI * R * R, cellArea = Math.PI * R * R;
const count = (mM: number, area: number) => Math.round((mM * area * DOT_DENSITY) / 1000);
const dots: string[] = [];
const scatter = (cls: string, nDots: number, where: () => number[], r: number) => { for (let i = 0; i < nDots; i++) { const [x, y] = where(); dots.push(`<g class="w w${i % 5}">${dot(cls, x, y, r)}</g>`); } };
scatter("na", count(I.BATH.Na, bathArea), bathAt, STAGE.dotR);
scatter("cl", count(I.BATH.Cl, bathArea), bathAt, STAGE.dotR);
scatter("k", count(I.BATH.K, bathArea), bathAt, STAGE.dotR);
const inner: string[] = [];
const scatterIn = (cls: string, nDots: number, r: number) => { for (let i = 0; i < nDots; i++) { const [x, y] = cellAt(); inner.push(`<g class="w w${(i + 2) % 5}">${dot(cls, x, y, r)}</g>`); } };
scatterIn("k", count(s.ci.K, cellArea), STAGE.dotR);
scatterIn("a", count(s.ci.A, cellArea), STAGE.aR);
scatterIn("na", Math.max(1, count(s.ci.Na, cellArea)), STAGE.dotR);
scatterIn("cl", Math.max(1, count(s.ci.Cl, cellArea)), STAGE.dotR);

// the ± rim at Vm (inside negative), as drawRim() does: C·|V|/e ions, one sign per IONS_PER_SIGN
const rimIons = (0.01 * 4 * Math.PI * 1e-10 * Math.abs(s.V)) / 1.602176634e-19;
const nRim = Math.round(rimIons / IONS_PER_SIGN / RIM_EVERY);
const rim: string[] = [];
for (let i = 0; i < nRim; i++) {
  const a = (i / nRim) * 2 * Math.PI + 0.013, [ox, oy] = at(a, R + STAGE.rimR), [ix, iy] = at(a, R - STAGE.rimR);
  rim.push(`<path class="rp" d="M${f(ox - 2.6)} ${f(oy)}h5.2M${f(ox)} ${f(oy - 2.6)}v5.2"/><path class="rn" d="M${f(ix - 2.6)} ${f(iy)}h5.2"/>`);
}

// pathways, at the lab's angles (src/views/lab.ts), drawn as drawPathway() draws them
const ANG = { K: -Math.PI / 2.6, Na: -Math.PI / 9, Cl: Math.PI * 0.22, pump: Math.PI * 0.62 };
const deg = (rad: number) => (rad * 180) / Math.PI;
const place = (rad: number, inner2: string) => { const [x, y] = at(rad, R); return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(deg(rad) + 90)}) scale(${K_SCALE})">${inner2}</g>`; };
const channel = (cls: string, rad: number) => place(rad, `<rect class="gap" x="-6" y="-9" width="12" height="18"/><rect class="${cls} ch" x="-14" y="-12" width="8" height="24" rx="3"/><rect class="${cls} ch" x="6" y="-12" width="8" height="24" rx="3"/>`);
const pump = place(ANG.pump, `<circle class="pump" r="16"/><g class="rotor"><path class="spoke" d="M0 0L14 0M0 0L-7 12.1M0 0L-7 -12.1"/></g>`);
const label = (t: string, rad: number) => { const [x, y] = at(rad, R + 40); return `<text class="lab" x="${f(x)}" y="${f(y)}">${t}</text>`; };

// crossings: a straight run through the pathway, from R − 22 to R + 22 (stage: 16 and 22, × its scale)
const keys: string[] = [], moving: string[] = [];
let kk = 0;
const cross = (cls: string, rad: number, dir: number, t0: number, spread = 0, dur = 1.6) => {
  const a = rad + spread, [x0, y0] = at(a, R - 22), [x1, y1] = at(a, R + 22);
  const [sx, sy, ex, ey] = dir > 0 ? [x0, y0, x1, y1] : [x1, y1, x0, y0];
  const p0 = (100 * t0) / LOOP, p1 = Math.min(99.9, (100 * (t0 + dur)) / LOOP), pa = p0 + (p1 - p0) * 0.15, pb = p0 + (p1 - p0) * 0.85;
  const name = `x${kk++}`;
  keys.push(`@keyframes ${name}{0%,${f(p0)}%{transform:translate(${f(sx)}px,${f(sy)}px);opacity:0}${f(pa)}%,${f(pb)}%{opacity:1}${f(p1)}%,100%{transform:translate(${f(ex)}px,${f(ey)}px);opacity:0}}.${name}{animation:${name} ${LOOP}s linear infinite}`);
  moving.push(`<g class="mv ${name}">${dot(cls, 0, 0, CROSS_R)}</g>`);
};
const times = (c: number, off: number) => Array.from({ length: c }, (_, i) => (off + (i * (LOOP - 1.8)) / Math.max(1, c)) % (LOOP - 1.8));
const jit = () => (rnd() - 0.5) * 0.09;
times(n.Kout, 0.2).forEach((t) => cross("k", ANG.K, +1, t, jit()));
times(n.Kin, 0.9).forEach((t) => cross("k", ANG.K, -1, t, jit()));
times(n.Nain, 0.6).forEach((t) => cross("na", ANG.Na, -1, t, jit()));
times(n.Naout, 5.1).forEach((t) => cross("na", ANG.Na, +1, t, jit()));
times(n.Cl, 0.4).forEach((t) => cross("cl", ANG.Cl, -1, t, jit()));
times(n.Cl, 2.3).forEach((t) => cross("cl", ANG.Cl, +1, t, jit()));
const PUMP_T = 5.4; // one cycle: 3 Na⁺ out together, then 2 K⁺ in together (as flowGroup() moves them)
[-0.09, 0, 0.09].forEach((d, i) => cross("na", ANG.pump, +1, PUMP_T + i * 0.12, d));
[-0.06, 0.06].forEach((d, i) => cross("k", ANG.pump, -1, PUMP_T + 1.9 + i * 0.12, d));

const commit = execSync("git rev-parse --short HEAD").toString().trim();
const dirty = execSync("git status --porcelain -- src scripts").toString().trim() !== "";
const [stx, sty] = at(ANG.K, R + 6), [snx, sny] = at(ANG.Na, R - 6);
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A living cell: K⁺ leaks out, Na⁺ leaks in, Cl⁻ crosses both ways, and the Na⁺/K⁺ pump turns">
<!--
  ionhomie, the home page's living cell (https://ionhomie.tonydefazio.com), drawn as its stage draws it.
  Made by: node scripts/tile-svg.ts   at commit ${commit}${dirty ? " (with uncommitted changes)" : ""}
  Looks: src/views/stage-style.ts (bath ${STAGE.bath}, cytoplasm ${STAGE.cyto}, rim ${STAGE.rimPlus}/${STAGE.rimMinus}, pump ${STAGE.pump},
    membrane width ${STAGE.membraneWidth}, dot radius ${STAGE.dotR}, A⁻ ${STAGE.aR}); ion colors from src/styles.css
    (--na ${COL.na}, --k ${COL.k}, --cl ${COL.cl}, --a ${COL.a}, --membrane ${COL.membrane}, --text ${COL.text}).
    Dots at the stage's density, ${DOT_DENSITY} per mM per 1000 px². Different from the stage, for a ${W}-wide tile:
    crossing dots r ${CROSS_R} (stage ${STAGE.crossR}); every ${RIM_EVERY === 2 ? "other" : RIM_EVERY + "th"} ± of the rim (each ≈ ${(RIM_EVERY * IONS_PER_SIGN).toLocaleString("en-US")} ions).
  The loop (${LOOP} s) is one steady state of the model's healthy cell (Vm ${(s.V * 1000).toFixed(1).replace("-", "−")} mV), one pump cycle per loop:
    the Na⁺/K⁺ pump: 3 Na⁺ out, then 2 K⁺ in; its rotor turns as the stage's does;
    the K⁺ leak: ${n.Kout} out and ${n.Kin} in (net 2 out, which the pump returns);
    the Na⁺ leak: ${n.Nain} in and ${n.Naout} out (net 3 in, which the pump returns);
    the Cl⁻ leak: ${n.Cl} in and ${n.Cl} out (Cl⁻ sits at its reversal potential)${clFrac > 1.05 ? `, 1 in ${f(clFrac)} shown` : ""}.
  Under prefers-reduced-motion: a still frame, one K⁺ just out of its leak and one Na⁺ just in.
-->
<style>
.bath{fill:${STAGE.bath}}.cyto{fill:${STAGE.cyto}}.gap{fill:${STAGE.bath}}
.na{fill:${COL.na};fill-opacity:.95}.k{fill:${COL.k};fill-opacity:.95}.cl{fill:${COL.cl};fill-opacity:.95}.a{fill:${COL.a};fill-opacity:.95}
.ch{fill-opacity:.95}.mem{fill:none;stroke:${COL.membrane};stroke-width:${STAGE.membraneWidth};stroke-opacity:.9}
.rp{stroke:${STAGE.rimPlus};stroke-width:1.6}.rn{stroke:${STAGE.rimMinus};stroke-width:1.6}
.pump{fill:${STAGE.pump}}.spoke{stroke:${COL.bg};stroke-width:2.5;fill:none}
.lab{font:600 12px system-ui,-apple-system,"Segoe UI",sans-serif;fill:${COL.text};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:${STAGE.bath};stroke-width:3px}
.rotor{animation:rotor ${LOOP}s linear infinite}@keyframes rotor{to{transform:rotate(2040deg)}}
@keyframes w0{50%{transform:translate(2px,-1.5px)}}@keyframes w1{50%{transform:translate(-1.5px,2px)}}@keyframes w2{50%{transform:translate(1.5px,1.5px)}}@keyframes w3{50%{transform:translate(-2px,-1px)}}@keyframes w4{50%{transform:translate(1px,-2px)}}
.w0{animation:w0 6s ease-in-out infinite}.w1{animation:w1 7s ease-in-out infinite -1s}.w2{animation:w2 6s ease-in-out infinite -2s}.w3{animation:w3 8s ease-in-out infinite -3s}.w4{animation:w4 6s ease-in-out infinite -4s}
${keys.join("\n")}
.still{opacity:0}
@media (prefers-reduced-motion: reduce){.w,.rotor,.mv{animation:none}.mv{opacity:0}.still{opacity:1}}
</style>
<rect class="bath" width="${W}" height="${H}" rx="8"/>
${dots.join("")}
<circle class="cyto" cx="${CX}" cy="${CY}" r="${R}"/>
${inner.join("")}
<circle class="mem" cx="${CX}" cy="${CY}" r="${R}"/>
${rim.join("")}
${channel("k", ANG.K)}${channel("na", ANG.Na)}${channel("cl", ANG.Cl)}${pump}
${moving.join("\n")}
<g class="still">${dot("k", stx, sty, CROSS_R)}${dot("na", snx, sny, CROSS_R)}</g>
${label("K⁺ leak", ANG.K)}${label("Na⁺ leak", ANG.Na)}${label("Cl⁻ leak", ANG.Cl)}${label("Na⁺/K⁺ pump", ANG.pump)}
</svg>
`);
