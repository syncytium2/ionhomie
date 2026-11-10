// protons.ts — the protons page's own small pH model (docs/adr/0022). It sits beside physics.ts, not inside it:
// the running cell's ions and pinned numbers are untouched.
//
// The cell is Siesjö's (1985, Prog Brain Res 63:121, Fig. 8): Vm −60 mV, pHo 7.3, [HCO₃⁻]o 25 mM, CO₂ equal on both
// sides. Vm is an input here, set by the page's slider, not solved: H⁺ and HCO₃⁻ carry far too little current to
// move it. CO₂ crosses the membrane freely and carbonic anhydrase is treated as instant, so [HCO₃⁻]i always follows
// pHi (Henderson–Hasselbalch with CO₂ and pK equal on both sides), and E_HCO₃ = E_H.
//
// The state is pHi. Acid that enters is mostly bound by buffers: dpHi/dt = −(net acid gain) / β, with β the
// intrinsic buffering power plus the open CO₂/HCO₃⁻ system's 2.3·[HCO₃⁻]i. The rule (docs/adr/0004): this file
// computes; the views only draw what it says.
//
// Fluxes are in mM/s of cytoplasm. The leak's absolute size, the metabolic acid load and the transporters' kinetics
// are illustrative (sour's SPEC values where it has them), chosen so the page runs at a watchable pace.

import { ghkFlux, rtf, T37 } from "./physics.ts";

/** The numbers on Siesjö's figure. */
export const SIESJO = { Vm: -60, pHo: 7.3, hco3o: 25, pHi: 7.0, hco3i: 12.5 } as const;

/** mV per pH unit, RT·ln10/F: 61.5 mV at 37 °C. */
export const slopeMv = (T = T37) => 1000 * rtf(T) * Math.LN10;
/** pHi at which H⁺ is in equilibrium at Vm (mV): pHo + Vm/S. */
export const passivePHi = (Vm: number, pHo: number) => pHo + Vm / slopeMv();
/** E_H in mV for a pHi, pHo. With CO₂ equal on both sides, E_HCO₃ is the same. */
export const eH = (pHi: number, pHo: number) => slopeMv() * (pHi - pHo);
/** [HCO₃⁻]i in mM, CO₂ and pK equal on both sides. */
export const hco3In = (pHi: number, pHo: number, hco3o: number) => hco3o * 10 ** (pHi - pHo);
/** Free H⁺ in mM. */
export const hFree = (pH: number) => 1e3 * 10 ** -pH;
/** Ions per µm³ at 1 mM. */
export const PER_UM3_PER_MM = 602214;

export interface Carrier { on: boolean; vmax: number; pK: number; n: number }
export interface PhCell {
  Vm: number; pHo: number; hco3o: number;
  /** intrinsic buffering power, mM per pH unit */
  betaI: number;
  /** scales the GHK H⁺ flux to mM/s of cytoplasm (P·area/volume, folded together; illustrative) */
  leakK: number;
  /** metabolic acid made inside, mM/s */
  metab: number; metabOn: boolean;
  /** NHE1: H⁺ out (Na⁺ in), activated by internal H⁺ */
  nhe: Carrier;
  /** NBC: HCO₃⁻ in (with Na⁺), the same activation form; counted as acid removed */
  nbc: Carrier;
}

export interface Fluxes { leak: number; metab: number; nhe: number; nbc: number; net: number }

/** The H⁺ leak, inward positive, in mM/s: GHK, so it is zero exactly at E_H. */
export const leakFlux = (c: PhCell, pHi: number) => -c.leakK * ghkFlux(1, 1, c.Vm / 1000, hFree(pHi), hFree(c.pHo));
const carrier = (k: Carrier, pHi: number) => (k.on ? k.vmax / (1 + 10 ** (k.n * (pHi - k.pK))) : 0);

/** Every acid flux, mM/s. leak and metab add acid; nhe and nbc remove it; net is the acid gained. */
export function fluxes(c: PhCell, pHi: number): Fluxes {
  const leak = leakFlux(c, pHi), metab = c.metabOn ? c.metab : 0, nhe = carrier(c.nhe, pHi), nbc = carrier(c.nbc, pHi);
  return { leak, metab, nhe, nbc, net: leak + metab - nhe - nbc };
}
/** Total buffering power, mM per pH unit. */
export const beta = (c: PhCell, pHi: number) => c.betaI + Math.LN10 * hco3In(pHi, c.pHo, c.hco3o);

/** Acid taken up by the buffers as pHi moves from pH0 to pH1 (mM; positive when pH falls). */
export const boundAcid = (c: PhCell, pH0: number, pH1: number) =>
  c.betaI * (pH0 - pH1) + (hco3In(pH0, c.pHo, c.hco3o) - hco3In(pH1, c.pHo, c.hco3o));

/** Advance pHi by dt seconds (sub-stepped forward Euler). */
export function stepPh(c: PhCell, pHi: number, dt: number) {
  const n = Math.max(1, Math.ceil(dt / 0.5));
  for (let k = 0; k < n; k++) pHi -= (fluxes(c, pHi).net / beta(c, pHi)) * (dt / n);
  return pHi;
}

/** The share of the acid extrusion each carrier does at rest (illustrative). */
export const NHE_SHARE = 0.6;
/** The leak's inward H⁺ flux at rest, mM/s, and the metabolic load, a quarter of it (both illustrative). */
export const LEAK_REST = 0.04, METAB = 0.01;

/**
 * Siesjö's cell, solved, not tuned: the leak is scaled to LEAK_REST at pHi 7.0, and each carrier's Vmax is set so
 * that together they remove exactly the leak and the metabolic acid there. pHi 7.0 is then a steady state.
 */
export function siesjoCell(Vm: number = SIESJO.Vm): PhCell {
  const c: PhCell = {
    Vm: SIESJO.Vm, pHo: SIESJO.pHo, hco3o: SIESJO.hco3o, betaI: 10, leakK: 1, metab: METAB, metabOn: true,
    nhe: { on: true, vmax: 1, pK: 6.9, n: 2 }, nbc: { on: true, vmax: 1, pK: 6.9, n: 2 },
  };
  c.leakK = LEAK_REST / leakFlux(c, SIESJO.pHi);
  const load = LEAK_REST + METAB;
  c.nhe.vmax = (NHE_SHARE * load) / carrier({ ...c.nhe, vmax: 1 }, SIESJO.pHi);
  c.nbc.vmax = ((1 - NHE_SHARE) * load) / carrier({ ...c.nbc, vmax: 1 }, SIESJO.pHi);
  c.Vm = Vm; // a different Vm moves the leak, and so the steady state, with the transporters as they are
  return c;
}

/** The pHi at which net acid gain is zero, by bisection (net acid gain falls as pHi falls). */
export function steadyPHi(c: PhCell) {
  let lo = 5.0, hi = 8.5;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (fluxes(c, m).net > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
