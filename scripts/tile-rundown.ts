// tile-rundown.ts — the data behind ionhomie's tile on tonydefazio.com: the rundown chapter's cell,
// no pump, from src/core/physics.ts with the chapter's own setup (Na⁺/K⁺-ATPase and PMCA off).
//
//   node scripts/tile-rundown.ts > rundown.json        (Node ≥ 23 runs the TypeScript directly)
import { execSync } from "node:child_process";
import * as I from "../src/core/physics.ts";

const MINUTES = 60, POINTS = 151, DT = 1; // s per integration step
const h = I.healthyState();
h.cell.pump.on = false; // the rundown chapter's setup: no ATP, no pump
h.cell.pmca.on = false;
let n = h.n;
const out = { t_s: [] as number[], Vm_mV: [] as number[], Na_i_mM: [] as number[], K_i_mM: [] as number[], Cl_i_mM: [] as number[], volume_rel: [] as number[] };
const vol0 = I.sphere(h.cell.radius).volume, every = (MINUTES * 60) / (POINTS - 1);
for (let t = 0, k = 0; k < POINTS; t += DT) {
  if (Math.abs(t - k * every) < DT / 2) {
    const s = I.snapshot(h.cell, n);
    out.t_s.push(t); out.Vm_mV.push(+(s.V * 1000).toFixed(3)); out.Na_i_mM.push(+s.ci.Na.toFixed(3)); out.K_i_mM.push(+s.ci.K.toFixed(3));
    out.Cl_i_mM.push(+s.ci.Cl.toFixed(3)); out.volume_rel.push(+(s.volume / vol0).toFixed(4));
    k++;
  }
  n = I.step(h.cell, n, DT).n;
}
const git = (c: string) => execSync(c).toString().trim();
console.log(JSON.stringify({
  what: "ionhomie rundown chapter: a cell with leaks and no pump. Vm drifts toward zero, Na⁺ in rises, K⁺ in falls, the cell swells.",
  ...out,
  parameters: {
    source: "src/core/physics.ts, healthyState() then pump.on = false and pmca.on = false (the rundown chapter's setup)",
    cell_radius_um: h.cell.radius * 1e6,
    permeability_m_per_s: h.cell.P,
    relative_permeability: "pK : pNa : pCl = 1 : 0.02 : 0.5 (Physiol 578 lecture, ohm/Nernst/GHK deck, slide 13)",
    bath_mM: I.BATH,
    start_inside_mM: { Na: 10, K: 140, Ca: 1e-4, Cl: +I.snapshot(I.healthyState().cell, I.healthyState().n).ci.Cl.toFixed(3) },
    start_Vm_mV: +(I.healthyState().V * 1000).toFixed(2),
    temperature_C: 37,
    integration: `forward Euler on amounts, dt = ${DT} s; Vm quasi-steady (zero net current) at every step`,
    duration_min: MINUTES, points: POINTS,
  },
  commit: git("git rev-parse --short HEAD"),
  dirty: git("git status --porcelain -- src scripts") !== "",
  command: "node scripts/tile-rundown.ts",
}, null, 1));
