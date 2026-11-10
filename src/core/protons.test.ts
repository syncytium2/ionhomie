// Every number the protons page quotes, pinned (docs/adr/0022). The model is the shared cell in physics.ts.
import { test } from "vitest";
import assert from "node:assert/strict";
import * as I from "./physics.ts";
import * as P from "./protons.ts";

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (±${tol})`);
const run = (cell: I.Cell, n: I.Amounts, seconds: number, dt = 5) => { for (let t = 0; t < seconds; t += dt) n = I.step(cell, n, dt).n; return n; };

test("S = RT·ln10/F is 61.5 mV per pH unit at 37 °C", () => close(I.slopeMv(), 61.54, 0.01));

test("Siesjö's figure is self-consistent: passive pHi 6.3 and HCO₃⁻ 2.5 mM at −60 mV", () => {
  const pass = P.passivePHi(-60, 7.3);
  close(pass, 6.325, 0.001, "passive pHi");
  close(I.hco3In(pass, I.BATH), 2.65, 0.01, "passive HCO₃⁻ (the figure rounds to 2.5; Siesjö's text says 2)");
  close(I.hco3In(7.0, I.BATH), 12.53, 0.01, "actual HCO₃⁻ (the figure's 12.5)");
  close(P.eHmv(7.0, 7.3), -18.46, 0.01, "E_H at 7.0: H⁺ driven in by 41.5 mV at −60");
});

test("Free H⁺: about 60 per µm³ inside at pH 7.0, 30 outside at 7.3", () => {
  close(I.hFree(7.0) * P.PER_UM3_PER_MM, 60.2, 0.1);
  close(I.hFree(7.3) * P.PER_UM3_PER_MM, 30.2, 0.1);
});

test("The bath: HCO₃⁻ split out of X leaves it electroneutral at 307.5 mOsm", () => {
  const b = I.BATH;
  close(b.Na + b.K + 2 * b.Ca - b.Cl - b.HCO3 - b.X, 0, 1e-12, "charge");
  close(I.osmolarity(b), 307.5, 1e-12, "mOsm");
});

test("The shared cell rests at pHi 7.0; stopping NHE and NBC lets it fall to its passive 6.0", () => {
  const h = I.healthyState();
  const s0 = I.snapshot(h.cell, h.n);
  close(s0.acid.leak / s0.volume * 60, 0.179, 0.001, "resting acid load, mM/min");
  close(run(h.cell, h.n, 3600).pHi, 7.0, 1e-4, "an hour later");
  h.cell.acid.nhe.on = false; h.cell.acid.nbc.on = false;
  const n = run(h.cell, h.n, 8 * 3600, 10);
  const s = I.snapshot(h.cell, n);
  close(n.pHi, P.passivePHi(s.V * 1000, 7.3), 0.03, "pHi after 8 h, against the passive value");
  close(n.pHi, 6.0, 0.03);
});

test("Siesjö's figure as a mode: clamped at −60 mV, pHi rests at 7.0 and falls to 6.32 without transport", () => {
  const h = I.healthyState();
  P.toSiesjo(h.cell);
  close(run(h.cell, h.n, 3600).pHi, 7.0, 0.01, "an hour later (Na⁺ inside drifts a little under the clamp)");
  h.cell.acid.nhe.on = false; h.cell.acid.nbc.on = false;
  close(run(h.cell, h.n, 12 * 3600, 10).pHi, 6.325, 0.03, "after 12 h");
});

test("Without the pump, pHi barely moves: depolarization cuts the H⁺ leak as the failing Na⁺ gradient slows NHE", () => {
  const h = I.healthyState();
  const s0 = I.snapshot(h.cell, h.n);
  h.cell.pump.on = false;
  const n = run(h.cell, h.n, 2 * 3600, 2);
  const s = I.snapshot(h.cell, n);
  close(n.pHi, 7.02, 0.01, "pHi after 2 h of rundown");
  assert.ok(s.acid.leak < 0.6 * s0.acid.leak, `the H⁺ leak falls as Vm depolarizes: ${s.acid.leak / s0.acid.leak}`);
  // so ischemic acidosis, in this model, needs metabolic acid: the transporters' failure alone does not make it
});

test("Buffering: falling from 7.0 to 6.32 binds about 16.6 mM, ~45,000 bound per free H⁺", () => {
  const { cell } = I.healthyState();
  const pass = P.passivePHi(-60, 7.3);
  const bound = I.boundAcid(cell, I.BATH, 7.0, pass), free = I.hFree(pass) - I.hFree(7.0);
  close(bound, 16.63, 0.01, "mM bound");
  close(bound / free, 44600, 200, "bound per free");
});
