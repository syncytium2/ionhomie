// Every number the protons page quotes, pinned (docs/adr/0022).
import { test } from "vitest";
import assert from "node:assert/strict";
import * as P from "./protons.ts";

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (±${tol})`);

test("S = RT·ln10/F is 61.5 mV per pH unit at 37 °C", () => close(P.slopeMv(), 61.54, 0.01));

test("Siesjö's figure is self-consistent: passive pHi 6.3 and HCO₃⁻ 2.5 mM at −60 mV", () => {
  const pass = P.passivePHi(P.SIESJO.Vm, P.SIESJO.pHo);
  close(pass, 6.325, 0.001, "passive pHi");
  close(P.hco3In(pass, P.SIESJO.pHo, P.SIESJO.hco3o), 2.65, 0.01, "passive HCO₃⁻ (the figure rounds to 2.5)");
  close(P.hco3In(P.SIESJO.pHi, P.SIESJO.pHo, P.SIESJO.hco3o), 12.53, 0.01, "actual HCO₃⁻ (the figure's 12.5)");
  close(P.eH(pass, P.SIESJO.pHo), P.SIESJO.Vm, 1e-9, "passive means E_H = Vm");
});

test("At pHi 7.0, E_H is −18.5 mV: H⁺ is driven in by 41.5 mV", () => {
  close(P.eH(7.0, 7.3), -18.46, 0.01);
  close(-60 - P.eH(7.0, 7.3), -41.54, 0.01);
});

test("Free H⁺: about 60 per µm³ inside at pH 7.0, 30 outside at 7.3", () => {
  close(P.hFree(7.0) * P.PER_UM3_PER_MM, 60.2, 0.1);
  close(P.hFree(7.3) * P.PER_UM3_PER_MM, 30.2, 0.1);
});

test("The H⁺ leak is zero exactly at the passive pHi", () => {
  const c = P.siesjoCell();
  close(P.leakFlux(c, P.passivePHi(c.Vm, c.pHo)), 0, 1e-12);
  assert.ok(P.leakFlux(c, 7.0) > 0, "at 7.0 H⁺ leaks in");
});

test("Siesjö's cell rests at pHi 7.0 with everything on", () => {
  const c = P.siesjoCell();
  close(P.fluxes(c, 7.0).net, 0, 1e-12, "net acid gain at 7.0");
  close(P.steadyPHi(c), 7.0, 1e-6);
  let pH = 7.0;
  for (let t = 0; t < 3600; t += 10) pH = P.stepPh(c, pH, 10);
  close(pH, 7.0, 1e-6, "an hour later");
});

test("Stop NHE and NBC with no metabolic acid: pHi falls to the passive value", () => {
  const c = P.siesjoCell();
  c.nhe.on = false; c.nbc.on = false; c.metabOn = false;
  close(P.steadyPHi(c), P.passivePHi(-60, 7.3), 1e-6);
  let pH = 7.0;
  for (let t = 0; t < 1800; t += 5) pH = P.stepPh(c, pH, 5);
  close(pH, 6.325, 0.02, "after 30 minutes");
});

test("With metabolic acid on, the transport-stopped cell settles below the passive value", () => {
  const c = P.siesjoCell();
  c.nhe.on = false; c.nbc.on = false;
  const s = P.steadyPHi(c);
  assert.ok(s < P.passivePHi(-60, 7.3) - 0.05, `${s}`);
  close(s, 6.247, 0.002);
});

test("Buffering: falling from 7.0 to the passive 6.32 binds about 16.6 mM, ~45,000 bound per free H⁺", () => {
  const c = P.siesjoCell(), pass = P.passivePHi(-60, 7.3);
  const bound = P.boundAcid(c, 7.0, pass), free = P.hFree(pass) - P.hFree(7.0);
  close(bound, 16.63, 0.01, "mM bound");
  close(bound / free, 44600, 200, "bound per free");
});

test("NHE alone, or NBC alone, holds pHi between passive and 7.0", () => {
  for (const off of ["nhe", "nbc"] as const) {
    const c = P.siesjoCell();
    c[off].on = false;
    const s = P.steadyPHi(c);
    assert.ok(s < 7.0 && s > P.passivePHi(-60, 7.3), `${off} off: ${s}`);
  }
});
