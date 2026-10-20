// physics.ts — the models every chapter shares. Ported from prototype/demo/physics.js, which
// its tests (now physics.test.ts) pinned first.
//
// Units are SI throughout, which makes concentration convenient: 1 mM is exactly 1 mol/m³.
// Potentials are in volts inside the core and converted to mV only at the edge (names ending
// in Mv). Fluxes are outward-positive, as membrane currents are.
//
// The rule (docs/adr/0004): this file computes; the views only draw what it says.

export type Ion = "Na" | "K" | "Cl" | "Ca";
export type Conc = Record<Ion, number>;
export type Monovalent = { K: number; Na: number; Cl: number };

export const F = 96485.33212; // C/mol
export const R = 8.314462618; // J/(mol·K)
export const T37 = 310.15; // K
export const ION_Z: Record<Ion, number> = { Na: 1, K: 1, Cl: -1, Ca: 2 };
export const IONS: Ion[] = ["Na", "K", "Cl", "Ca"];

/** RT/F in volts: 26.73 mV at 37 °C. */
export const rtf = (T = T37) => (R * T) / F;

// ---------- equilibrium ----------

/** Nernst potential in volts for valence z, outside and inside concentrations (any one unit). */
export const nernst = (z: number, co: number, ci: number, T = T37) => (rtf(T) / z) * Math.log(co / ci);
export const nernstMv = (z: number, co: number, ci: number, T = T37) => 1000 * nernst(z, co, ci, T);

/** GHK voltage equation for monovalent ions; P are relative or absolute permeabilities. */
export function ghkVoltage(P: Monovalent, ci: Monovalent, co: Monovalent, T = T37) {
  const num = P.K * co.K + P.Na * co.Na + P.Cl * ci.Cl;
  const den = P.K * ci.K + P.Na * ci.Na + P.Cl * co.Cl;
  return rtf(T) * Math.log(num / den);
}
export const ghkVoltageMv = (P: Monovalent, ci: Monovalent, co: Monovalent, T = T37) => 1000 * ghkVoltage(P, ci, co, T);

// ---------- flux ----------

/**
 * GHK flux density, mol/(m²·s), outward positive. P in m/s, concentrations in mol/m³ (= mM),
 * V in volts. It is zero exactly at the Nernst potential, which is the point of using it.
 */
export function ghkFlux(P: number, z: number, V: number, ci: number, co: number, T = T37) {
  const u = (z * V) / rtf(T);
  if (Math.abs(u) < 1e-6) return P * (ci - co) * (1 + u / 2);
  const e = Math.exp(-u);
  return (P * u * (ci - co * e)) / (1 - e);
}
/**
 * The GHK flux split into its two one-way parts, mol/(m²·s), both positive: efflux (in → out)
 * and influx (out → in). efflux − influx is ghkFlux exactly. At the reversal potential they are
 * equal: ions still cross both ways, with nothing net. The views draw these, not the net.
 */
export function ghkUnidirectional(P: number, z: number, V: number, ci: number, co: number, T = T37) {
  const u = (z * V) / rtf(T);
  if (Math.abs(u) < 1e-6) return { efflux: P * ci * (1 + u / 2), influx: P * co * (1 - u / 2) };
  const e = Math.exp(-u), k = (P * u) / (1 - e);
  return { efflux: k * ci, influx: k * co * e };
}
/** GHK current density, A/m², outward positive. */
export const ghkCurrent = (P: number, z: number, V: number, ci: number, co: number, T = T37) => z * F * ghkFlux(P, z, V, ci, co, T);

// ---------- a spherical cell ----------

export const sphere = (radius: number) => ({ area: 4 * Math.PI * radius * radius, volume: (4 / 3) * Math.PI * radius ** 3 });

/** How many monovalent ions must cross to charge a membrane by dV volts, and what fraction of the cell's K⁺ that is. */
export function chargeLedger(radius: number, dV: number, kIn: number, cm = 0.01) {
  const { area, volume } = sphere(radius);
  const capacitance = cm * area; // F
  const ions = (capacitance * Math.abs(dV)) / 1.602176634e-19;
  const kIons = kIn * volume * 6.02214076e23;
  return { capacitance, ions, kIons, fraction: ions / kIons };
}

// ---------- the pump–leak cell ----------
//
// State: amounts (mol) of Na⁺, K⁺, Cl⁻, Ca²⁺ and the impermeant anion A inside; the bath is
// fixed. Water follows instantly, so the volume always makes inside osmolarity equal the bath's.
// Vm is quasi-steady: the voltage at which the net membrane current is zero. The capacitive
// charge that Vm implies is tiny (see chargeLedger) and is not subtracted from the amounts.

export type Bath = Conc & { X: number };
export type Amounts = Conc & { A: number };
export type Inside = Conc & { A: number };

/**
 * The bath: the extracellular values of the Physiol 578 lecture's neuronal table (ohm/Nernst/GHK
 * deck, slide 8): Na⁺ 145, K⁺ 5, Cl⁻ 106, Ca²⁺ 2.5 mM. X stands for the other anions (bicarbonate,
 * phosphate, …), valence −1, sized to make the bath electroneutral: 145 + 5 + 2·2.5 = 106 + 49.
 * Osmolarity 307.5 mOsm.
 */
export const BATH: Bath = { Na: 145, K: 5, Cl: 106, Ca: 2.5, X: 49 };
export const osmolarity = (c: Bath) => c.Na + c.K + c.Cl + c.Ca + c.X;

export interface Cell {
  radius: number;
  P: Conc; // m/s
  pump: { on: boolean; imax: number; kNa: number; kK: number };
  pmca: { on: boolean; vmax: number; k: number; n: number };
  nkcc1: number;
  kcc2: number;
  zA: number;
}

export const defaultCell = (): Cell => ({
  radius: 10e-6,
  // The lecture's "typical resting cell", pK : pNa : pCl = 1 : 0.02 : 0.5 (ohm/Nernst/GHK deck,
  // slide 13). The absolute scale (P_K) is illustrative and sets only how fast things happen.
  P: { K: 3e-8, Na: 0.02 * 3e-8, Cl: 0.5 * 3e-8, Ca: 1e-12 },
  // Na⁺/K⁺-ATPase: maximal current density A/m²; Hill activation by internal Na⁺ (3) and external K⁺ (2).
  pump: { on: true, imax: 0, kNa: 10, kK: 1.5 },
  // PMCA: maximal Ca²⁺ extrusion, mol/(m²·s); Hill n = 2, K = 0.2 µM. Electroneutral here (Ca²⁺/H⁺ not modeled).
  pmca: { on: true, vmax: 0, k: 0.2e-3, n: 2 },
  // Cation–chloride cotransporters: mol/s per unit of ln(driving ratio).
  nkcc1: 0,
  kcc2: 0,
  zA: -1,
});

/** The Na⁺/K⁺-ATPase cycle rate, mol/s (each cycle: 3 Na⁺ out, 2 K⁺ in, one net + out, one ATP). */
export function pumpRate(cell: Cell, ci: Conc, bath: Bath, area: number) {
  if (!cell.pump.on) return 0;
  const fNa = ci.Na ** 3 / (ci.Na ** 3 + cell.pump.kNa ** 3);
  const fK = bath.K ** 2 / (bath.K ** 2 + cell.pump.kK ** 2);
  return (cell.pump.imax * area * fNa * fK) / F;
}
export function pmcaRate(cell: Cell, ci: Conc, area: number) {
  if (!cell.pmca.on) return 0;
  const { k, n } = cell.pmca;
  return cell.pmca.vmax * area * (ci.Ca ** n / (ci.Ca ** n + k ** n));
}
/** NKCC1, mol/s inward (1 Na⁺, 1 K⁺, 2 Cl⁻ per cycle). Negative means it runs outward. */
export function nkcc1Rate(cell: Cell, ci: Conc, bath: Bath) {
  if (!cell.nkcc1) return 0;
  return cell.nkcc1 * Math.log((bath.Na * bath.K * bath.Cl ** 2) / (ci.Na * ci.K * ci.Cl ** 2));
}
/** KCC2, mol/s outward (1 K⁺, 1 Cl⁻ per cycle). Negative means it runs inward. */
export function kcc2Rate(cell: Cell, ci: Conc, bath: Bath) {
  if (!cell.kcc2) return 0;
  return cell.kcc2 * Math.log((ci.K * ci.Cl) / (bath.K * bath.Cl));
}

const concentrations = (n: Amounts, volume: number): Inside => ({
  Na: n.Na / volume, K: n.K / volume, Cl: n.Cl / volume, Ca: n.Ca / volume, A: n.A / volume,
});
const volumeFor = (n: Amounts, bath: Bath) => (n.Na + n.K + n.Cl + n.Ca + n.A) / osmolarity(bath);

/**
 * Extra transport imposed from outside the model, mol/s per ion, outward positive: the homeostat's
 * hand-dragged ions. It is carried in the zero-current solve as well as in the amounts, so an
 * unbalanced extra flux moves Vm and the leaks pay its charge back, as they do for the pump's.
 */
export type Extra = Partial<Conc>;
const extraCurrent = (extra?: Extra) => {
  let i = 0;
  if (extra) for (const ion of IONS) i += ION_Z[ion] * F * (extra[ion] ?? 0);
  return i;
};

/** Net membrane current (A, outward positive) at V: the leaks, the pump's net charge, and any extra flux. */
export function netCurrent(cell: Cell, V: number, ci: Conc, bath: Bath, area: number, extra?: Extra) {
  let i = 0;
  for (const ion of IONS) i += area * ghkCurrent(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]);
  return i + F * pumpRate(cell, ci, bath, area) + extraCurrent(extra);
}

/** The Vm at which net current is zero. Current rises monotonically with V, so bisection is safe. */
export function restingV(cell: Cell, ci: Conc, bath: Bath, area: number, extra?: Extra) {
  let lo = -0.2, hi = 0.2;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (netCurrent(cell, mid, ci, bath, area, extra) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface Snapshot {
  V: number; ci: Inside; volume: number; area: number;
  leak: Conc; pump: number; pmca: number; nkcc1: number; kcc2: number;
  E: Conc; net: Conc;
}

/** Everything a view wants to draw about the cell right now. */
export function snapshot(cell: Cell, n: Amounts, bath: Bath = BATH, extra?: Extra): Snapshot {
  const { area } = sphere(cell.radius);
  const volume = volumeFor(n, bath);
  const ci = concentrations(n, volume);
  const V = restingV(cell, ci, bath, area, extra);
  const leak = {} as Conc, E = {} as Conc;
  for (const ion of IONS) {
    leak[ion] = area * ghkFlux(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]); // mol/s, outward
    E[ion] = nernst(ION_Z[ion], bath[ion], ci[ion]);
  }
  const pump = pumpRate(cell, ci, bath, area);
  const pmca = pmcaRate(cell, ci, area);
  const nkcc1 = nkcc1Rate(cell, ci, bath);
  const kcc2 = kcc2Rate(cell, ci, bath);
  const net: Conc = {
    Na: leak.Na + 3 * pump - nkcc1 + (extra?.Na ?? 0),
    K: leak.K - 2 * pump - nkcc1 + kcc2 + (extra?.K ?? 0),
    Cl: leak.Cl - 2 * nkcc1 + kcc2 + (extra?.Cl ?? 0),
    Ca: leak.Ca + pmca + (extra?.Ca ?? 0),
  };
  return { V, ci, volume, area, leak, pump, pmca, nkcc1, kcc2, E, net };
}

/** Advance the cell by dt seconds (forward Euler on amounts; dt of a second or two is stable here). */
export function step(cell: Cell, n: Amounts, dt: number, bath: Bath = BATH, extra?: Extra): { n: Amounts; s: Snapshot } {
  const s = snapshot(cell, n, bath, extra);
  return {
    n: {
      Na: Math.max(n.Na - s.net.Na * dt, 1e-30),
      K: Math.max(n.K - s.net.K * dt, 1e-30),
      Cl: Math.max(n.Cl - s.net.Cl * dt, 1e-30),
      Ca: Math.max(n.Ca - s.net.Ca * dt, 1e-30),
      A: n.A,
    },
    s,
  };
}

/**
 * Amounts for a cell of the given radius holding the given internal concentrations, with the
 * impermeant anion chosen so the inside is electroneutral and isosmotic with the bath.
 */
export function amountsFor(radius: number, ci: Conc, bath: Bath = BATH) {
  const vol = sphere(radius).volume;
  const A = osmolarity(bath) - (ci.Na + ci.K + ci.Cl + ci.Ca);
  if (A <= 0) throw new Error("those concentrations leave no room for the impermeant anion");
  const charge = ci.Na + ci.K + 2 * ci.Ca - ci.Cl; // balanced by zA·A
  return { n: { Na: ci.Na * vol, K: ci.K * vol, Cl: ci.Cl * vol, Ca: ci.Ca * vol, A: A * vol }, zA: -charge / A };
}

// ---------- the healthy cell every compartment chapter starts from ----------
//
// Not tuned by hand: solved exactly. Fix the lecture's inside values, Na⁺ 10 mM, K⁺ 140 mM and
// Ca²⁺ 0.1 µM. For Na⁺
// and K⁺ to be steady, the pump must return 3 Na⁺ for every 2 K⁺ the leaks carry, which happens
// at exactly one Vm: 2·leak_Na(V) + 3·leak_K(V) = 0. That Vm fixes the pump's strength, Cl⁻ sits
// passively at E_Cl = Vm, the PMCA balances the Ca²⁺ leak, and the impermeant anion is whatever
// makes the inside electroneutral and isosmotic. physics.test.ts pins the result.

export const HEALTHY_TARGET = { Na: 10, K: 140, Ca: 1e-4 };

// Cotransporter strengths that bring the healthy cell's E_Cl to two measured E_GABA values, solved
// by bisection and pinned in physics.test.ts. The cell is generic: these say what transport could
// produce each value, not what any real cell expresses.
// In this cell, passive Cl⁻ already sits at E_Cl = Vm = −80.3 mV (5.2 mM inside), so KCC2 can only
// push it lower; its preset aims at −85 mV, between Vm and E_K, and is illustrative, not a measurement.
export const CCC_PRESETS = {
  none: { nkcc1: 0, kcc2: 0 },
  kcc2: { nkcc1: 0, kcc2: 2.481e-16 }, // E_Cl −85 mV: KCC2-dominated, as in adult cortex (illustrative)
  gnrh: { nkcc1: 2.8566e-16, kcc2: 0 }, // E_Cl −36.5 mV, E_GABA measured in adult mouse GnRH neurons (DeFazio et al. 2002)
};

export function healthyState(target = HEALTHY_TARGET, bath: Bath = BATH) {
  const cell = defaultCell();
  const { area } = sphere(cell.radius);
  const leak = (ion: Ion, V: number, c: number) => area * ghkFlux(cell.P[ion], ION_Z[ion], V, c, bath[ion]);
  const f = (V: number) => 2 * leak("Na", V, target.Na) + 3 * leak("K", V, target.K);
  let lo = -0.2, hi = 0.05;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  const V = (lo + hi) / 2;
  const rate = leak("K", V, target.K) / 2; // pump cycles, mol/s
  const fNa = target.Na ** 3 / (target.Na ** 3 + cell.pump.kNa ** 3);
  const fK = bath.K ** 2 / (bath.K ** 2 + cell.pump.kK ** 2);
  cell.pump.imax = (rate * F) / (area * fNa * fK);
  const { k, n: h } = cell.pmca;
  cell.pmca.vmax = -leak("Ca", V, target.Ca) / (area * (target.Ca ** h / (target.Ca ** h + k ** h)));
  const Cl = bath.Cl * Math.exp(V / rtf()); // E_Cl = Vm for z = −1
  const a = amountsFor(cell.radius, { Na: target.Na, K: target.K, Cl, Ca: target.Ca }, bath);
  cell.zA = a.zA;
  return { cell, n: a.n, V };
}

// ---------- one compartment, fast channels, fixed concentrations ----------

/** dV/dt for a membrane with fixed concentrations and given permeabilities (m/s). */
export function dVdt(P: Partial<Conc>, V: number, ci: Partial<Conc>, co: Partial<Conc>, cm = 0.01, T = T37) {
  let i = 0;
  for (const ion of Object.keys(P) as Ion[]) i += ghkCurrent(P[ion]!, ION_Z[ion], V, ci[ion]!, co[ion]!, T);
  return -i / cm;
}
/** GHK slope conductance per unit area (S/m²) near V, for the membrane time constant. */
export function slopeConductance(P: Partial<Conc>, V: number, ci: Partial<Conc>, co: Partial<Conc>, T = T37) {
  const h = 1e-5;
  let g = 0;
  for (const ion of Object.keys(P) as Ion[]) {
    g += (ghkCurrent(P[ion]!, ION_Z[ion], V + h, ci[ion]!, co[ion]!, T) - ghkCurrent(P[ion]!, ION_Z[ion], V - h, ci[ion]!, co[ion]!, T)) / (2 * h);
  }
  return g;
}

// ---------- particles: the predictions the particle chapters are checked against ----------

/** Abramowitz & Stegun 7.1.26; |error| < 1.5e-7, ample for a profile drawn on screen. */
export function erf(x: number) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
/**
 * Diffusion in a box [0, L] with reflecting walls, everything starting in the left half at
 * concentration 1. Exact cosine series: c = ½ + Σ (2/nπ)·sin(nπ/2)·cos(nπx/L)·e^(−(nπ/L)²Dt).
 */
export function boxStepProfile(x: number, t: number, D: number, L: number, terms = 400) {
  let c = 0.5;
  for (let n = 1; n <= terms; n++) {
    const s = Math.sin((n * Math.PI) / 2);
    if (Math.abs(s) < 1e-12) continue;
    const decay = Math.exp(-(((n * Math.PI) / L) ** 2) * D * t);
    if (decay < 1e-14) break;
    c += (2 / (n * Math.PI)) * s * Math.cos((n * Math.PI * x) / L) * decay;
  }
  return c;
}
/** Fick's flux, J = −D·dc/dx, through the middle of that box (concentration units·m/s). */
export function boxMidFlux(t: number, D: number, L: number) {
  if (t <= 0) return Infinity;
  const h = L * 1e-4;
  return (-D * (boxStepProfile(L / 2 + h, t, D, L) - boxStepProfile(L / 2 - h, t, D, L))) / (2 * h);
}
/** Mean time to diffuse a distance x in one dimension: t = x² / 2D. */
export const diffusionTime1D = (x: number, D: number) => (x * x) / (2 * D);
/** Equilibrium ratio c_out / c_in for valence z with the inside at V volts (Boltzmann; Nernst read backward). */
export const boltzmannRatio = (z: number, V: number, T = T37) => Math.exp((z * V) / rtf(T));

/** Free-solution diffusion coefficients at 25 °C, m²/s. Recalled table values, to verify (MILESTONES). */
export const D_FREE: Conc = { K: 1.96e-9, Na: 1.33e-9, Cl: 2.03e-9, Ca: 0.79e-9 };
