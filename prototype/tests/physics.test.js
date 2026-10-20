// The contract: every number a demo page quotes is pinned here.  node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("../demo/physics.js");

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (±${tol})`);

test("RT/F at 37 °C is 26.73 mV", () => close(I.rtf() * 1000, 26.727, 0.001));

test("Nernst potentials quoted on the pages", () => {
  close(I.nernstMv(1, 5, 140), -89.06, 0.01, "E_K 5/140");
  close(I.nernstMv(1, 145, 12), 66.60, 0.01, "E_Na 145/12");
  close(I.nernstMv(2, 2, 1e-4), 132.34, 0.01, "E_Ca 2 mM / 0.1 µM");
});

test("GHK flux is zero exactly at the Nernst potential, for every valence", () => {
  for (const [z, co, ci] of [[1, 5, 140], [1, 145, 12], [-1, 110, 7], [2, 2, 1e-4]]) {
    const E = I.nernst(z, co, ci);
    close(I.ghkFlux(1e-8, z, E, ci, co), 0, 1e-15, `z=${z}`);
    assert.ok(I.ghkFlux(1e-8, z, E + 0.01, ci, co) * z > 0, "above E the ion's current is outward");
  }
});

test("GHK voltage with one permeable ion is that ion's Nernst potential", () => {
  const ci = { K: 140, Na: 12, Cl: 7 }, co = { K: 5, Na: 145, Cl: 110 };
  close(I.ghkVoltageMv({ K: 1, Na: 0, Cl: 0 }, ci, co), I.nernstMv(1, 5, 140), 1e-9);
  close(I.ghkVoltageMv({ K: 0, Na: 1, Cl: 0 }, ci, co), I.nernstMv(1, 145, 12), 1e-9);
  close(I.ghkVoltageMv({ K: 0, Na: 0, Cl: 1 }, ci, co), I.nernstMv(-1, 110, 7), 1e-9);
});

test("The charge ledger: 100 mV on a 10 µm cell is about 1 K⁺ in 45,000", () => {
  const L = I.chargeLedger(10e-6, 0.1, 140);
  close(L.capacitance * 1e12, 12.566, 0.001, "pF");
  close(L.ions / 1e6, 7.843, 0.001, "million ions");
  close(L.kIons / 1e11, 3.532, 0.001, "×1e11 K⁺");
  close(1 / L.fraction, 45026, 5, "one in");
});

test("The healthy cell is an exact pump–leak steady state at −73.8 mV", () => {
  const h = I.healthyState();
  const s = I.snapshot(h.cell, h.n);
  close(s.V * 1000, -73.81, 0.01, "Vm");
  close(s.ci.Na, 12, 1e-9); close(s.ci.K, 140, 1e-9); close(s.ci.Ca, 1e-4, 1e-12);
  close(s.E.Cl, s.V, 1e-5, "Cl⁻ is passively distributed");
  for (const ion of ["Na", "K", "Cl", "Ca"]) close(s.net[ion], 0, 1e-19, `net ${ion}`);
  close(s.pump * I.F * 1e12, 20.62, 0.01, "pump current, pA");
  close(s.volume / I.sphere(10e-6).volume, 1, 1e-9, "volume");
});

test("The pump's direct electrogenic share is about 5 mV", () => {
  const h = I.healthyState();
  h.cell.pump.on = false;
  const s = I.snapshot(h.cell, h.n);
  close(s.V * 1000, -68.92, 0.01, "Vm the instant the pump stops");
});

test("Without the pump the cell runs down and swells", () => {
  const h = I.healthyState();
  h.cell.pump.on = false;
  let n = h.n;
  for (let t = 0; t < 1800; t += 5) n = I.step(h.cell, n, 5).n;
  const s = I.snapshot(h.cell, n);
  assert.ok(s.ci.Na > 130, `Na⁺ after 30 min: ${s.ci.Na}`);
  assert.ok(s.ci.K < 20, `K⁺ after 30 min: ${s.ci.K}`);
  assert.ok(s.V > -0.025, `Vm after 30 min: ${s.V}`);
  assert.ok(s.volume / I.sphere(10e-6).volume > 1.15, "swollen");
});

test("KCC2 pulls E_Cl below Vm toward E_K; NKCC1 pushes it above Vm", () => {
  const run = (nkcc1, kcc2) => {
    const h = I.healthyState();
    h.cell.nkcc1 = nkcc1; h.cell.kcc2 = kcc2;
    let n = h.n;
    for (let t = 0; t < 20000; t += 2) n = I.step(h.cell, n, 2).n;
    return I.snapshot(h.cell, n);
  };
  const k = run(0, 1e-16);
  assert.ok(k.E.Cl < k.V && k.E.Cl > k.E.K, "KCC2: E_K < E_Cl < Vm");
  close(k.E.Cl * 1000, -83.3, 0.1, "E_Cl with KCC2 1e-16");
  const nk = run(1e-16, 0);
  assert.ok(nk.E.Cl > nk.V, "NKCC1: E_Cl > Vm");
  close(nk.E.Cl * 1000, -30.9, 0.1, "E_Cl with NKCC1 1e-16");
});

test("Diffusion times quoted on the diffusion page (1D, t = x²/2D, D_K⁺)", () => {
  close(I.diffusionTime1D(10e-9, I.D_FREE.K) * 1e9, 25.5, 0.1, "10 nm, ns");
  close(I.diffusionTime1D(1e-6, I.D_FREE.K) * 1e3, 0.255, 0.001, "1 µm, ms");
  close(I.diffusionTime1D(100e-6, I.D_FREE.K), 2.55, 0.01, "100 µm, s");
  close(I.diffusionTime1D(1e-2, I.D_FREE.K) / 3600, 7.09, 0.01, "1 cm, h");
});

test("At the Nernst potential the Boltzmann ratio is the concentration ratio", () => {
  close(I.boltzmannRatio(1, I.nernst(1, 5, 140)), 5 / 140, 1e-12);
  close(I.boltzmannRatio(-1, I.nernst(-1, 110, 7)), 110 / 7, 1e-9);
  close(I.boltzmannRatio(2, I.nernst(2, 2, 1e-4)), 2 / 1e-4, 1e-6);
});

test("erf is accurate enough to draw", () => {
  close(I.erf(0), 0, 1e-7); close(I.erf(0.5), 0.5204999, 2e-7); close(I.erf(-1), -0.8427008, 2e-7);
});

test("The reflecting-box profile starts as a step, conserves amount, and ends flat", () => {
  const D = I.D_FREE.K, L = 10e-6;
  close(I.boxStepProfile(0.25 * L, 1e-9, D, L), 1, 0.02, "left, at once");
  close(I.boxStepProfile(0.75 * L, 1e-9, D, L), 0, 0.02, "right, at once");
  for (const t of [1e-4, 1e-3, 1e-2]) {
    let sum = 0; const N = 2000;
    for (let i = 0; i < N; i++) sum += I.boxStepProfile(((i + 0.5) / N) * L, t, D, L);
    close(sum / N, 0.5, 1e-3, `amount at t=${t}`);
  }
  close(I.boxStepProfile(0, 1, D, L), 0.5, 1e-9, "flat after a second");
  assert.ok(I.boxMidFlux(1e-3, D, L) > 0, "flux runs left to right");
});

test("The cotransporter presets reach the E_GABA values the chloride page quotes", () => {
  for (const [name, target] of [["cortex", -80], ["gnrh", -36.5]]) {
    const h = I.healthyState();
    Object.assign(h.cell, I.CCC_PRESETS[name]);
    let n = h.n;
    for (let t = 0; t < 30000; t += 2) n = I.step(h.cell, n, 2).n;
    close(I.snapshot(h.cell, n).E.Cl * 1000, target, 0.05, name);
  }
});
