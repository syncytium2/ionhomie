// tile-svg.ts — ionhomie's tile figure for tonydefazio.com: the home page's living cell as one
// self-contained, script-free, animated SVG on a light ground.
//
//   node scripts/tile-svg.ts > tile.svg
//
// Every crossing in the loop comes from src/core/physics.ts at the healthy steady state: one pump
// cycle per loop (3 Na⁺ out, 2 K⁺ in), and the leaks' one-way crossings in the model's own
// proportions to it, so the loop is a true steady state: what the pump moves, the leaks return.
import { execSync } from "node:child_process";
import * as I from "../src/core/physics.ts";

const W = 420, H = 170, CX = 210, CY = 85, R = 58, LOOP = 12; // seconds per loop
const h = I.healthyState(), s = I.snapshot(h.cell, h.n), area = s.area;
const oneWay = (ion: "K" | "Na" | "Cl") => {
  const u = I.ghkUnidirectional(h.cell.P[ion], I.ION_Z[ion], s.V, s.ci[ion], I.BATH[ion]);
  return { out: u.efflux * area, in: u.influx * area }; // mol/s
};
const perLoop = 1 / s.pump; // one pump cycle per loop: crossings per loop = flux (mol/s) × this
const cnt = (x: number) => Math.round(x * perLoop);
const K = oneWay("K"), Na = oneWay("Na"), Cl = oneWay("Cl");
const n = { Kout: cnt(K.out), Kin: cnt(K.in), Naout: cnt(Na.out), Nain: cnt(Na.in), Clout: cnt(Cl.out), Clin: cnt(Cl.in) };
// Cl⁻'s one-way flux is several times K⁺'s at this pCl; keep the loop readable by showing Cl⁻ at a
// stated fraction, equal both ways (it sits at its reversal potential, so nothing is lost).
const clShow = Math.min(n.Clout, 3), clFrac = n.Clout / clShow;

let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f1 = (x: number) => +x.toFixed(1);
const at = (deg: number, r: number) => [CX + Math.cos((deg * Math.PI) / 180) * r, CY + Math.sin((deg * Math.PI) / 180) * r];

// glyphs: circles for cations, diamonds for anions, rounded shapes for A⁻
const circ = (cls: string, x: number, y: number, r = 2.6) => `<circle class="${cls}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`;
const diam = (cls: string, x: number, y: number, r = 2.9) => `<path class="${cls}" d="M${f1(x)} ${f1(y - r)}l${r} ${r}l${-r} ${r}l${-r} ${-r}z"/>`;
const blob = (x: number, y: number) => `<rect class="a" x="${f1(x - 3.6)}" y="${f1(y - 2.2)}" width="7.2" height="4.4" rx="2.2"/>`;
const glyph = (ion: string, x: number, y: number) => (ion === "Cl" ? diam("cl", x, y) : circ(ion === "K" ? "k" : "na", x, y));

const bathPos = () => { for (;;) { const x = 6 + rnd() * (W - 12), y = 6 + rnd() * (H - 12); if (Math.hypot(x - CX, y - CY) > R + 10) return [x, y]; } };
const cellPos = (rr = R - 9) => { const a = rnd() * 2 * Math.PI, r = rr * Math.sqrt(rnd()); return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; };

// the bath at the stage's own proportions: Na⁺ 145, Cl⁻ 106, K⁺ 5 mM
const bath: string[] = [];
for (let i = 0; i < 64; i++) { const [x, y] = bathPos(); bath.push(`<g class="w w${i % 4}">${circ("na", x, y)}</g>`); }
for (let i = 0; i < 47; i++) { const [x, y] = bathPos(); bath.push(`<g class="w w${(i + 1) % 4}">${diam("cl", x, y)}</g>`); }
for (let i = 0; i < 2; i++) { const [x, y] = bathPos(); bath.push(`<g class="w w${(i + 2) % 4}">${circ("k", x, y)}</g>`); }
// inside: K⁺ 140, A⁻ ~150, Na⁺ 10, Cl⁻ 5 mM, at the same density per mM
const cell: string[] = [];
for (let i = 0; i < 14; i++) { const [x, y] = cellPos(); cell.push(`<g class="w w${i % 4}">${circ("k", x, y)}</g>`); }
for (let i = 0; i < 14; i++) { const [x, y] = cellPos(); cell.push(`<g class="w w${(i + 3) % 4}">${blob(x, y)}</g>`); }
{ const [x, y] = cellPos(); cell.push(`<g class="w w1">${circ("na", x, y)}</g>`); }
{ const [x, y] = cellPos(); cell.push(`<g class="w w2">${diam("cl", x, y)}</g>`); }

// the ± rim: Vm −80 mV, inside negative
const rim: string[] = [];
for (let i = 0; i < 36; i++) {
  const d = (i / 36) * 360 + 4, [ox, oy] = at(d, R + 7), [ix, iy] = at(d, R - 7);
  rim.push(`<path class="rp" d="M${f1(ox - 2)} ${f1(oy)}h4M${f1(ox)} ${f1(oy - 2)}v4"/><path class="rn" d="M${f1(ix - 2)} ${f1(iy)}h4"/>`);
}

// pathways on the membrane
const ANG = { K: -62, Na: -12, Cl: 42, pump: 128 };
const channel = (cls: string, deg: number) => {
  const [x, y] = at(deg, R);
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${deg + 90})"><rect class="${cls} ch" x="-9" y="-8" width="5.5" height="16" rx="2"/><rect class="${cls} ch" x="3.5" y="-8" width="5.5" height="16" rx="2"/></g>`;
};
const [px, py] = at(ANG.pump, R);
const pump = `<g transform="translate(${f1(px)} ${f1(py)}) rotate(${ANG.pump + 90})"><g class="rock"><rect class="pump" x="-9" y="-11" width="18" height="22" rx="7"/><path class="pumpv" d="M-4 -6L0 0L-4 6M4 -6L0 0L4 6"/></g></g>`;

// crossings: each a keyframed straight run from inside the cell, through the pathway, out (or back)
const css: string[] = [];
const moving: string[] = [];
let k = 0;
const cross = (ion: string, deg: number, dir: number, t0: number, dur = 1.6, spread = 0) => {
  const a = deg + spread, [x0, y0] = at(a, R - 20), [x1, y1] = at(a, R + 20);
  const [sx, sy, ex, ey] = dir > 0 ? [x0, y0, x1, y1] : [x1, y1, x0, y0];
  const p0 = (100 * t0) / LOOP, p1 = (100 * (t0 + dur)) / LOOP, pm1 = p0 + (p1 - p0) * 0.15, pm2 = p0 + (p1 - p0) * 0.85;
  const name = `c${k++}`;
  css.push(`@keyframes ${name}{0%,${f1(p0)}%{transform:translate(${f1(sx)}px,${f1(sy)}px);opacity:0}${f1(pm1)}%{opacity:1}${f1(pm2)}%{opacity:1}${f1(Math.min(p1, 99.9))}%,100%{transform:translate(${f1(ex)}px,${f1(ey)}px);opacity:0}}`);
  css.push(`.${name}{animation:${name} ${LOOP}s linear infinite}`);
  moving.push(`<g class="mv ${name}">${glyph(ion, 0, 0)}</g>`);
};
const spaced = (count: number, offset: number) => Array.from({ length: count }, (_, i) => (offset + (i * LOOP) / Math.max(1, count)) % (LOOP - 1.8));
spaced(n.Kout, 0.3).forEach((t) => cross("K", ANG.K, +1, t, 1.6, (rnd() - 0.5) * 6));
spaced(n.Kin, 1.1).forEach((t) => cross("K", ANG.K, -1, t, 1.6, (rnd() - 0.5) * 6));
spaced(n.Nain, 0.7).forEach((t) => cross("Na", ANG.Na, -1, t, 1.6, (rnd() - 0.5) * 6));
spaced(n.Naout, 4.2).forEach((t) => cross("Na", ANG.Na, +1, t, 1.6, (rnd() - 0.5) * 6));
spaced(clShow, 0.5).forEach((t) => cross("Cl", ANG.Cl, -1, t, 1.6, (rnd() - 0.5) * 6));
spaced(clShow, 2.5).forEach((t) => cross("Cl", ANG.Cl, +1, t, 1.6, (rnd() - 0.5) * 6));
// the pump: one cycle per loop, 3 Na⁺ out together, then 2 K⁺ in together, with a rock of the protein
const PUMP_T = 5.5;
[-8, 0, 8].forEach((d, i) => cross("Na", ANG.pump, +1, PUMP_T + i * 0.12, 1.6, d));
[-5, 5].forEach((d, i) => cross("K", ANG.pump, -1, PUMP_T + 1.9 + i * 0.12, 1.6, d));
const r0 = (100 * PUMP_T) / LOOP, r1 = (100 * (PUMP_T + 1.9)) / LOOP, r2 = (100 * (PUMP_T + 3.8)) / LOOP;
css.push(`@keyframes rock{0%,${f1(r0)}%{transform:rotate(0deg)}${f1(r0 + 4)}%{transform:rotate(-14deg)}${f1(r1)}%{transform:rotate(-14deg)}${f1(r1 + 4)}%{transform:rotate(14deg)}${f1(r2)}%{transform:rotate(14deg)}${f1(r2 + 4)}%,100%{transform:rotate(0deg)}}`);

const commit = execSync("git rev-parse --short HEAD").toString().trim();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A living cell: K⁺ leaks out, Na⁺ leaks in, Cl⁻ crosses both ways, and the Na⁺/K⁺ pump puts 3 Na⁺ out and 2 K⁺ in each cycle">
<!--
  ionhomie, the home page's living cell (https://ionhomie.tonydefazio.com), drawn by scripts/tile-svg.ts from
  src/core/physics.ts at commit ${commit}. Command: node scripts/tile-svg.ts
  The loop (${LOOP} s) is one steady state of the model's healthy cell (Vm ${(s.V * 1000).toFixed(1)} mV):
    the Na⁺/K⁺ pump runs one cycle: 3 Na⁺ out, then 2 K⁺ in;
    the K⁺ leak: ${n.Kout} out and ${n.Kin} in (net 2 out, which the pump returns);
    the Na⁺ leak: ${n.Nain} in and ${n.Naout} out (net 3 in, which the pump returns);
    the Cl⁻ leak: equal both ways (Cl⁻ sits at its reversal potential), shown at 1 in ${f1(clFrac)} of its crossings.
  Counts are the model's one-way fluxes in proportion to one pump cycle. The ± rim is the membrane charge, inside negative.
  Bath and cell dots are at one density per mM (Na⁺ 145, Cl⁻ 106, K⁺ 5 outside; K⁺ 140, A⁻, Na⁺ 10, Cl⁻ 5 inside).
  Colors are classes (.na .k .cl .a .mem .rp .rn .pump .pumpv .ch) for the host stylesheet to tune.
-->
<style>
.na{fill:#1b1719}.k{fill:#1f6fb2}.cl{fill:#c4521a}.a{fill:#b89a68}.bath{fill:#f6f3ee}.cyto{fill:#efe9f3}
.mem{fill:none;stroke:#c9a46a;stroke-width:6}.rp{stroke:#b5482f;stroke-width:1.2}.rn{stroke:#2c6fb0;stroke-width:1.2}
.k.ch{fill:#1f6fb2}.na.ch{fill:#1b1719}.cl.ch{fill:#c4521a}.pump{fill:#7a5cc4}.pumpv{fill:none;stroke:#fff;stroke-width:1.6}
.rock{animation:rock ${LOOP}s ease-in-out infinite}
@keyframes w0{50%{transform:translate(1.5px,-1px)}}@keyframes w1{50%{transform:translate(-1px,1.5px)}}@keyframes w2{50%{transform:translate(1px,1px)}}@keyframes w3{50%{transform:translate(-1.5px,-1px)}}
.w0{animation:w0 6s ease-in-out infinite}.w1{animation:w1 6s ease-in-out infinite;animation-delay:-1.5s}.w2{animation:w2 6s ease-in-out infinite;animation-delay:-3s}.w3{animation:w3 6s ease-in-out infinite;animation-delay:-4.5s}
${css.join("\n")}
@media (prefers-reduced-motion: reduce){.w,.rock,.mv{animation:none}.mv{opacity:0}.still{opacity:1}}
.still{opacity:0}
</style>
<rect class="bath" width="${W}" height="${H}" rx="8"/>
${bath.join("")}
<circle class="cyto" cx="${CX}" cy="${CY}" r="${R}"/>
${cell.join("")}
<circle class="mem" cx="${CX}" cy="${CY}" r="${R}"/>
${rim.join("")}
${channel("k", ANG.K)}${channel("na", ANG.Na)}${channel("cl", ANG.Cl)}${pump}
${moving.join("\n")}
<g class="still">${glyph("K", ...(at(ANG.K, R + 3) as [number, number]))}${glyph("Na", ...(at(ANG.Na, R - 3) as [number, number]))}</g>
</svg>
`;
process.stdout.write(svg);
