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

/** The bath, mM, and its pH. HCO₃⁻ is held by the bath's CO₂ (docs/adr/0022). */
export type Bath = Conc & { X: number; HCO3: number; pHo: number };
/** The cell's state: amounts (mol) of each ion and the trapped anion, and its pHi (buffered; not an amount). */
export type Amounts = Conc & { A: number; pHi: number };
/** Inside concentrations, mM, with free H⁺ (mM) and HCO₃⁻, which follow pHi. */
export type Inside = Conc & { A: number; HCO3: number; H: number; pHi: number };

/**
 * The bath: the extracellular values of the Physiol 578 lecture's neuronal table (ohm/Nernst/GHK
 * deck, slide 8): Na⁺ 145, K⁺ 5, Cl⁻ 106, Ca²⁺ 2.5 mM. HCO₃⁻ 25 mM at pH 7.3, Siesjö's extracellular
 * values (1985, Prog Brain Res 63:121, Fig. 8). X stands for the other anions (phosphate, …), valence −1,
 * sized to make the bath electroneutral: 145 + 5 + 2·2.5 = 106 + 25 + 24. Osmolarity 307.5 mOsm, as before
 * HCO₃⁻ was split out of X.
 */
export const BATH: Bath = { Na: 145, K: 5, Cl: 106, Ca: 2.5, HCO3: 25, X: 24, pHo: 7.3 };
export const osmolarity = (c: Bath) => c.Na + c.K + c.Cl + c.Ca + c.HCO3 + c.X;

// ---------- protons and bicarbonate (docs/adr/0022) ----------
//
// CO₂ crosses the membrane freely and carbonic anhydrase is treated as instant, with CO₂ equal on both sides, so
// [HCO₃⁻]i = [HCO₃⁻]o·10^(pHi − pHo) at every moment and E_HCO₃ = E_H. The state is pHi; acid that enters is mostly
// bound, so pHi moves by the net acid gained over the buffering power β = β_i + 2.3·[HCO₃⁻]i.

/** mV per pH unit, RT·ln10/F: 61.5 mV at 37 °C. */
export const slopeMv = (T = T37) => 1000 * rtf(T) * Math.LN10;
/** Free H⁺, mM. */
export const hFree = (pH: number) => 1e3 * 10 ** -pH;
/** [HCO₃⁻]i, mM, for this pHi against this bath. */
export const hco3In = (pHi: number, bath: Bath) => bath.HCO3 * 10 ** (pHi - bath.pHo);
/** Buffering power, mM per pH unit: intrinsic, plus the open CO₂/HCO₃⁻ system. */
export const buffering = (cell: Cell, pHi: number, bath: Bath) => cell.acid.betaI + Math.LN10 * hco3In(pHi, bath);
/** Acid the buffers take up as pHi moves from pH0 to pH1, mM (positive when pH falls). */
export const boundAcid = (cell: Cell, bath: Bath, pH0: number, pH1: number) =>
  cell.acid.betaI * (pH0 - pH1) + (hco3In(pH0, bath) - hco3In(pH1, bath));
/** CO₂'s solubility, mM per mmHg, and its pK at 37 °C: [HCO₃⁻] = S·Pco₂·10^(pH − 6.1) (Henderson–Hasselbalch). */
export const CO2_SOL = 0.0307, PK_CO2 = 6.1;
/** The bath's CO₂ tension, mmHg, from its pH and HCO₃⁻ (equal inside, by assumption). */
export const pco2 = (bath: Bath) => bath.HCO3 / (CO2_SOL * 10 ** (bath.pHo - PK_CO2));

/**
 * Change the CO₂ by a factor (2 doubles it). Two ways:
 * - alone (respiratory acidosis): the bath's HCO₃⁻ does not change, so pHo falls by log₁₀(factor);
 * - with pHo held (isohydric): the bath's HCO₃⁻ changes by the same factor, replacing Cl⁻ one for one so the bath stays
 *   electroneutral and isosmotic, and pHo stays where it was.
 * Inside, the CO₂ that enters hydrates to equal amounts of H⁺ and HCO₃⁻; only the non-bicarbonate buffers can take up that
 * H⁺, so pHi falls at once to where the HCO₃⁻ made equals β_i times the fall. The amounts are untouched; `hydrated` is the
 * HCO₃⁻ carbonic anhydrase made at once, mol.
 */
export function co2Step(cell: Cell, n: Amounts, bath: Bath, factor: number, holdPHo = false): { n: Amounts; bath: Bath; hydrated: number } {
  const dHCO3 = bath.HCO3 * (factor - 1);
  const b2: Bath = holdPHo ? { ...bath, HCO3: bath.HCO3 + dHCO3, Cl: bath.Cl - dHCO3 } : { ...bath, pHo: bath.pHo - Math.log10(factor) };
  const h0 = hco3In(n.pHi, bath);
  const f = (p: number) => hco3In(p, b2) - h0 - cell.acid.betaI * (n.pHi - p); // HCO₃⁻ made − H⁺ the buffers took
  let lo = n.pHi - 2, hi = n.pHi + 2;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  const pHi = (lo + hi) / 2;
  // what carbonic anhydrase hydrated at once, mol (negative when CO₂ falls and it runs back)
  const hydrated = (hco3In(pHi, b2) - h0) * volumeFor(n, bath);
  return { n: { ...n, pHi }, bath: b2, hydrated };
}

/** Activation of an acid extruder by internal H⁺: 1 / (1 + 10^(n(pHi − pK))). */
const byPHi = (k: { pK: number; n: number }, pHi: number) => 1 / (1 + 10 ** (k.n * (pHi - k.pK)));

export interface Cell {
  radius: number;
  P: Conc; // m/s
  pump: { on: boolean; imax: number; kNa: number; kK: number };
  pmca: { on: boolean; vmax: number; k: number; n: number };
  ncx: { on: boolean; g: number };
  /**
   * A whole-cell recording, or none: Vm held at V volts by the amplifier, which supplies whatever current that takes (it
   * is not carried by the cell's ions, so it does not enter the amounts); with holdK, the pipette also holds the K⁺ inside.
   */
  clamp: { V: number; holdK: boolean } | null;
  /**
   * Acid and base (docs/adr/0022). PH: the H⁺ leak's permeability, m/s. NHE1 (1 Na⁺ in, 1 H⁺ out) and NBC (taken as the
   * electroneutral NBCn1, 1 Na⁺ and 1 HCO₃⁻ in) are activated by internal H⁺ and driven by the Na⁺ gradient: rate =
   * k·area·activation(pHi)·ln(driving ratio), mol/s, so each runs down, stops or reverses as thermodynamics allows.
   * betaI: intrinsic buffering power, mM per pH unit. (No metabolic acid: made inside without its anion, it would break
   * electroneutrality, and K⁺ would pile up without limit.)
   */
  acid: {
    PH: number; betaI: number;
    nhe: { on: boolean; k: number; pK: number; n: number };
    nbc: { on: boolean; k: number; pK: number; n: number };
  };
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
  // Na⁺/Ca²⁺ exchanger: conductance S/m², solved in healthyState to carry NCX_SHARE of the resting Ca²⁺ extrusion.
  ncx: { on: true, g: 0 },
  clamp: null,
  // The H⁺ leak's permeability is illustrative: it sets the resting acid load (about 0.2 mM/min) and so how fast pHi falls
  // when transport stops. NHE and NBC activation (pK 6.9, Hill n 2) and β_i 10 mM/pH are sour's illustrative values; k is
  // solved in healthyState so that pHi rests at 7.0, NHE carrying NHE_SHARE of the extrusion.
  acid: { PH: 7e-5, betaI: 10, nhe: { on: true, k: 0, pK: 6.9, n: 2 }, nbc: { on: true, k: 0, pK: 6.9, n: 2 } },
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
/**
 * The Na⁺/Ca²⁺ exchanger (NCX): 3 Na⁺ for 1 Ca²⁺, so each cycle carries one net charge. It uses no ATP,
 * only the Na⁺ gradient, and it reverses where Vm crosses its reversal potential, E_NCX = 3·E_Na − 2·E_Ca.
 * A linear teaching model: current = g·area·(Vm − E_NCX), outward positive.
 */
export const ncxReversal = (ci: Conc, bath: Bath) => 3 * nernst(1, bath.Na, ci.Na) - 2 * nernst(2, bath.Ca, ci.Ca);
export function ncxCurrent(cell: Cell, V: number, ci: Conc, bath: Bath, area: number) {
  if (!cell.ncx.on || !cell.ncx.g) return 0;
  return cell.ncx.g * area * (V - ncxReversal(ci, bath));
}
/** NCX cycles, mol/s: positive is forward (Ca²⁺ out, 3 Na⁺ in, an inward current), negative is reversed. */
export const ncxRate = (cell: Cell, V: number, ci: Conc, bath: Bath, area: number) => -ncxCurrent(cell, V, ci, bath, area) / F;

/** NHE1, mol/s of H⁺ out (and Na⁺ in). Negative means it runs in reverse. */
export function nheRate(cell: Cell, ci: Inside, bath: Bath, area: number) {
  const k = cell.acid.nhe;
  if (!k.on || !k.k) return 0;
  return k.k * area * byPHi(k, ci.pHi) * Math.log((bath.Na * ci.H) / (ci.Na * hFree(bath.pHo)));
}
/** NBC (NBCn1), mol/s of HCO₃⁻ in (with Na⁺): acid removed. Negative means it runs in reverse. */
export function nbcRate(cell: Cell, ci: Inside, bath: Bath, area: number) {
  const k = cell.acid.nbc;
  if (!k.on || !k.k) return 0;
  return k.k * area * byPHi(k, ci.pHi) * Math.log((bath.Na * bath.HCO3) / (ci.Na * ci.HCO3));
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

const concentrations = (n: Amounts, volume: number, bath: Bath): Inside => ({
  Na: n.Na / volume, K: n.K / volume, Cl: n.Cl / volume, Ca: n.Ca / volume, A: n.A / volume,
  HCO3: hco3In(n.pHi, bath), H: hFree(n.pHi), pHi: n.pHi,
});
// water follows instantly: inside osmolarity equals the bath's. HCO₃⁻ is set by pHi, not by its amount, so it takes its
// share of the osmolarity first and the amounts fill the rest
const volumeFor = (n: Amounts, bath: Bath) => (n.Na + n.K + n.Cl + n.Ca + n.A) / (osmolarity(bath) - hco3In(n.pHi, bath));
/** The H⁺ leak, mol/s, outward positive (GHK, so zero exactly at E_H). */
const hLeak = (cell: Cell, V: number, ci: Inside, bath: Bath, area: number) => area * ghkFlux(cell.acid.PH, 1, V, ci.H, hFree(bath.pHo));

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

/**
 * Net membrane current (A, outward positive) at V: the leaks (H⁺'s too), the pump's net charge, NCX, and any extra flux.
 * NHE and NBC (NBCn1) are electroneutral and carry none.
 */
export function netCurrent(cell: Cell, V: number, ci: Inside, bath: Bath, area: number, extra?: Extra) {
  let i = 0;
  for (const ion of IONS) i += area * ghkCurrent(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]);
  i += F * hLeak(cell, V, ci, bath, area);
  return i + F * pumpRate(cell, ci, bath, area) + ncxCurrent(cell, V, ci, bath, area) + extraCurrent(extra);
}

/**
 * The Vm at which net current is zero. Current rises monotonically with V, so bisection is safe.
 * The bracket starts at ±200 mV and widens if the root lies outside it (stacked hand carries can
 * push it there), so the answer is never a silent bound.
 */
export function restingV(cell: Cell, ci: Inside, bath: Bath, area: number, extra?: Extra) {
  let lo = -0.2, hi = 0.2;
  for (let k = 0; k < 8 && netCurrent(cell, lo, ci, bath, area, extra) > 0; k++) lo *= 2;
  for (let k = 0; k < 8 && netCurrent(cell, hi, ci, bath, area, extra) < 0; k++) hi *= 2;
  for (let k = 0; k < 90; k++) {
    const mid = (lo + hi) / 2;
    if (netCurrent(cell, mid, ci, bath, area, extra) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface Snapshot {
  V: number; ci: Inside; volume: number; area: number;
  leak: Conc; pump: number; pmca: number; ncx: number; nkcc1: number; kcc2: number;
  /** the clamp's holding current, A (outward positive), when the cell is clamped; 0 otherwise */
  iClamp: number;
  E: Conc; net: Conc;
  /**
   * Acid and base, mol/s: the H⁺ leak (inward positive), NHE (H⁺ out), NBC (HCO₃⁻ in), and the net acid
   * gained; ca, carbonic anhydrase's net hydration (CO₂ → H⁺ + HCO₃⁻; negative runs it back), which CO₂'s net entry
   * equals. E_H in volts (= E_HCO₃ here). beta in mM per pH unit.
   */
  acid: { leak: number; nhe: number; nbc: number; net: number; ca: number; EH: number; beta: number };
}

/** Everything a view wants to draw about the cell right now. */
export function snapshot(cell: Cell, n: Amounts, bath: Bath = BATH, extra?: Extra): Snapshot {
  const { area } = sphere(cell.radius);
  const volume = volumeFor(n, bath);
  const ci = concentrations(n, volume, bath);
  const V = cell.clamp ? cell.clamp.V : restingV(cell, ci, bath, area, extra);
  const iClamp = cell.clamp ? -netCurrent(cell, V, ci, bath, area, extra) : 0;
  const leak = {} as Conc, E = {} as Conc;
  for (const ion of IONS) {
    leak[ion] = area * ghkFlux(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]); // mol/s, outward
    E[ion] = nernst(ION_Z[ion], bath[ion], ci[ion]);
  }
  const pump = pumpRate(cell, ci, bath, area);
  const pmca = pmcaRate(cell, ci, area);
  const ncx = ncxRate(cell, V, ci, bath, area);
  const nkcc1 = nkcc1Rate(cell, ci, bath);
  const kcc2 = kcc2Rate(cell, ci, bath);
  const nhe = nheRate(cell, ci, bath, area), nbc = nbcRate(cell, ci, bath, area);
  const hIn = -hLeak(cell, V, ci, bath, area);
  const beta = buffering(cell, ci.pHi, bath), netAcid = hIn - nhe - nbc;
  const acid = { leak: hIn, nhe, nbc, net: netAcid, ca: 0, EH: nernst(1, hFree(bath.pHo), ci.H), beta };
  const net: Conc = {
    Na: leak.Na + 3 * pump - 3 * ncx - nkcc1 - nhe - nbc + (extra?.Na ?? 0),
    K: leak.K - 2 * pump - nkcc1 + kcc2 + (extra?.K ?? 0),
    Cl: leak.Cl - 2 * nkcc1 + kcc2 + (extra?.Cl ?? 0),
    Ca: leak.Ca + pmca + ncx + (extra?.Ca ?? 0),
  };
  // carbonic anhydrase's net hydration, CO₂ + H₂O → H⁺ + HCO₃⁻, mol/s (negative: dehydration). CA is instant, so it is
  // whatever keeps HCO₃⁻ on pHi as the cell's volume changes: the HCO₃⁻ inside (amount) changes by NBC's import plus this.
  // CO₂ crosses the membrane at the same net rate (inward when positive), since CO₂ inside is held equal to the bath's.
  const dHCO3 = -Math.LN10 * ci.HCO3 * (netAcid / volume / beta); // mM/s, through pHi
  const dVol = (-(net.Na + net.K + net.Cl + net.Ca) + volume * dHCO3) / (osmolarity(bath) - ci.HCO3); // m³/s
  acid.ca = ci.HCO3 * dVol + volume * dHCO3 - nbc;
  return { V, ci, volume, area, leak, pump, pmca, ncx, iClamp, nkcc1, kcc2, E, net, acid };
}

/** Advance the cell by dt seconds (forward Euler on amounts; dt of a second or two is stable here). */
export function step(cell: Cell, n: Amounts, dt: number, bath: Bath = BATH, extra?: Extra): { n: Amounts; s: Snapshot } {
  const s = snapshot(cell, n, bath, extra);
  return {
    n: {
      Na: Math.max(n.Na - s.net.Na * dt, 1e-30),
      K: cell.clamp?.holdK ? n.K : Math.max(n.K - s.net.K * dt, 1e-30),
      Cl: Math.max(n.Cl - s.net.Cl * dt, 1e-30),
      Ca: Math.max(n.Ca - s.net.Ca * dt, 1e-30),
      A: n.A,
      // mol/s ÷ m³ is mM/s; the buffers take up all but a sliver of it
      pHi: n.pHi - (s.acid.net / s.volume / s.acid.beta) * dt,
    },
    s,
  };
}

/**
 * Amounts for a cell of the given radius holding the given internal concentrations, with the
 * impermeant anion chosen so the inside is electroneutral and isosmotic with the bath.
 */
export function amountsFor(radius: number, ci: Conc, bath: Bath = BATH, pHi = HEALTHY_PHI) {
  const vol = sphere(radius).volume, hco3 = hco3In(pHi, bath);
  const A = osmolarity(bath) - (ci.Na + ci.K + ci.Cl + ci.Ca + hco3);
  if (A <= 0) throw new Error("those concentrations leave no room for the impermeant anion");
  const charge = ci.Na + ci.K + 2 * ci.Ca - ci.Cl - hco3; // balanced by zA·A
  return { n: { Na: ci.Na * vol, K: ci.K * vol, Cl: ci.Cl * vol, Ca: ci.Ca * vol, A: A * vol, pHi }, zA: -charge / A };
}

// ---------- the healthy cell every compartment chapter starts from ----------
//
// Not tuned by hand: solved exactly. Fix the lecture's inside values, Na⁺ 10 mM, K⁺ 140 mM and
// Ca²⁺ 0.1 µM. For Na⁺
// and K⁺ to be steady, the pump must return 3 Na⁺ for every 2 K⁺ the leaks carry, and also the
// 3 Na⁺ that NCX brings in for each Ca²⁺ it puts out, and the Na⁺ that NHE and NBC bring in with each acid they
// remove, which at pHi 7.0 equals the H⁺ the leak lets in. That happens at exactly one Vm:
// 2·leak_Na(V) + 3·leak_K(V) − 6·ncx(V) − 2·hIn(V) = 0. The H⁺ leak's inward current is then repaid by the Na⁺ the pump
// returns, so the net current is zero there too. That Vm fixes the pump's strength, Cl⁻ sits
// passively at E_Cl = Vm, PMCA and NCX share the Ca²⁺ leak, and the impermeant anion is whatever
// makes the inside electroneutral and isosmotic. physics.test.ts pins the result.

export const HEALTHY_TARGET = { Na: 10, K: 140, Ca: 1e-4 };
/** The resting pHi: Siesjö's measured 7.0 (1985, Fig. 8). */
export const HEALTHY_PHI = 7.0;
/** The share of the resting acid extrusion NHE1 carries; NBC carries the rest. Illustrative. */
export const NHE_SHARE = 0.6;
/** The H⁺ leak's permeability, m/s (illustrative): it sets the resting acid load, and so how fast pHi falls when transport stops. */
export const H_LEAK_P = 7e-5;

/**
 * The share of the resting Ca²⁺ extrusion NCX carries; PMCA carries the rest. Illustrative, not
 * sourced: at a resting Ca²⁺ of 0.1 µM the high-affinity PMCA does most of the work, and the
 * low-affinity, high-capacity NCX matters most when Ca²⁺ is high or the Na⁺ gradient fails.
 */
export const NCX_SHARE = 0.5;

// Cotransporter strengths that bring the healthy cell's E_Cl to two measured E_GABA values, solved
// by bisection and pinned in physics.test.ts. The cell is generic: these say what transport could
// produce each value, not what any real cell expresses.
// In this cell, passive Cl⁻ already sits at E_Cl = Vm = −80.1 mV (5.3 mM inside), so KCC2 can only
// push it lower; its preset aims at −85 mV, between Vm and E_K, and is illustrative, not a measurement.
export const CCC_PRESETS = {
  none: { nkcc1: 0, kcc2: 0 },
  kcc2: { nkcc1: 0, kcc2: 2.603e-16 }, // E_Cl −85 mV: KCC2-dominated, as in adult cortex (illustrative)
  gnrh: { nkcc1: 2.7152e-16, kcc2: 0 }, // E_Cl −36.5 mV, E_GABA measured in adult mouse GnRH neurons (DeFazio et al. 2002)
  // The recording: KCC2 ten times the cortex preset, so it, not the Cl⁻ leak, sets Cl⁻ under the clamp and E_Cl follows E_K
  // (illustrative; with the lecture's large Cl⁻ leak the preset alone moves E_Cl only a few mV)
  recording: { nkcc1: 0, kcc2: 2.603e-15 },
};

/**
 * DeFazio, Keros, Quick & Hablitz 2000 (J Neurosci 20:8069): in mature neocortical pyramidal neurons, whole-cell, bath K⁺ moved
 * internal Cl⁻ through KCC2. The recording here: Vm held at −70 mV (chosen, not the paper's protocol) and K⁺ inside held by the
 * pipette; Cl⁻ free.
 */
export const RECORDING = { V: -0.07, holdK: true };

export function healthyState(target = HEALTHY_TARGET, bath: Bath = BATH, ncxShare = NCX_SHARE, PH = H_LEAK_P) {
  const cell = defaultCell();
  cell.acid.PH = PH;
  const { area } = sphere(cell.radius);
  const leak = (ion: Ion, V: number, c: number) => area * ghkFlux(cell.P[ion], ION_Z[ion], V, c, bath[ion]);
  const ncx = (V: number) => -ncxShare * leak("Ca", V, target.Ca); // forward cycles, mol/s
  const hOut = hFree(bath.pHo), hIn0 = hFree(HEALTHY_PHI);
  const hIn = (V: number) => -area * ghkFlux(cell.acid.PH, 1, V, hIn0, hOut); // the H⁺ leak, mol/s inward
  const f = (V: number) => 2 * leak("Na", V, target.Na) + 3 * leak("K", V, target.K) - 6 * ncx(V) - 2 * hIn(V);
  let lo = -0.2, hi = 0.05;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  const V = (lo + hi) / 2;
  const rate = leak("K", V, target.K) / 2; // pump cycles, mol/s
  const fNa = target.Na ** 3 / (target.Na ** 3 + cell.pump.kNa ** 3);
  const fK = bath.K ** 2 / (bath.K ** 2 + cell.pump.kK ** 2);
  cell.pump.imax = (rate * F) / (area * fNa * fK);
  const { k, n: h } = cell.pmca;
  cell.pmca.vmax = -(1 - ncxShare) * leak("Ca", V, target.Ca) / (area * (target.Ca ** h / (target.Ca ** h + k ** h)));
  const eNcx = ncxReversal({ Na: target.Na, K: target.K, Cl: 0, Ca: target.Ca }, bath);
  cell.ncx.g = (ncx(V) * F) / (area * (eNcx - V)); // forward cycles = −g·area·(V − E_NCX)/F
  if (!ncxShare) cell.ncx.on = false;
  const Cl = bath.Cl * Math.exp(V / rtf()); // E_Cl = Vm for z = −1
  const a = amountsFor(cell.radius, { Na: target.Na, K: target.K, Cl, Ca: target.Ca }, bath, HEALTHY_PHI);
  cell.zA = a.zA;
  solveAcid(cell, V, { Na: target.Na, HCO3: hco3In(HEALTHY_PHI, bath), H: hIn0, pHi: HEALTHY_PHI }, bath, hIn(V));
  return { cell, n: a.n, V };
}

/** Set NHE's and NBC's k so that, at this Vm and these concentrations, they remove exactly `acidIn` mol/s between them. */
export function solveAcid(cell: Cell, V: number, ci: Pick<Inside, "Na" | "HCO3" | "H" | "pHi">, bath: Bath, acidIn: number) {
  const { area } = sphere(cell.radius);
  const nheUnit = byPHi(cell.acid.nhe, ci.pHi) * Math.log((bath.Na * ci.H) / (ci.Na * hFree(bath.pHo)));
  const nbcUnit = byPHi(cell.acid.nbc, ci.pHi) * Math.log((bath.Na * bath.HCO3) / (ci.Na * ci.HCO3));
  cell.acid.nhe.k = (NHE_SHARE * acidIn) / (area * nheUnit);
  cell.acid.nbc.k = ((1 - NHE_SHARE) * acidIn) / (area * nbcUnit);
  void V;
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
