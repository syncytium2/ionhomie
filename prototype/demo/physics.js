// physics.js — the models every demo page shares, in plain JavaScript.
//
// Units are SI throughout, which makes concentration convenient: 1 mM is exactly 1 mol/m³.
// Potentials are in volts inside the core and converted to mV only at the edge
// (the functions whose names end in Mv). Fluxes are outward-positive, as membrane currents are.
//
// The rule (docs/adr/0004): this file computes; the pages only draw what it says.
// Tested by tests/physics.test.js; every number a page quotes is pinned there.

const Ions = (() => {
  const F = 96485.33212;     // C/mol
  const R = 8.314462618;     // J/(mol·K)
  const T37 = 310.15;        // K

  const rtf = (T = T37) => (R * T) / F;           // volts; 26.73 mV at 37 °C

  // ---------- equilibrium ----------

  /** Nernst potential in volts for valence z, outside and inside concentrations (any one unit). */
  function nernst(z, co, ci, T = T37) {
    return (rtf(T) / z) * Math.log(co / ci);
  }
  const nernstMv = (z, co, ci, T) => 1000 * nernst(z, co, ci, T);

  /** GHK voltage equation for monovalent ions; P are relative or absolute permeabilities. */
  function ghkVoltage(P, ci, co, T = T37) {
    const num = P.K * co.K + P.Na * co.Na + P.Cl * ci.Cl;
    const den = P.K * ci.K + P.Na * ci.Na + P.Cl * co.Cl;
    return rtf(T) * Math.log(num / den);
  }
  const ghkVoltageMv = (P, ci, co, T) => 1000 * ghkVoltage(P, ci, co, T);

  // ---------- flux ----------

  /**
   * GHK flux density, mol/(m²·s), outward positive.
   * P in m/s, concentrations in mol/m³ (= mM), V in volts.
   * At zero net flux this returns the Nernst potential, which is the point of using it.
   */
  function ghkFlux(P, z, V, ci, co, T = T37) {
    const u = (z * V) / rtf(T);
    if (Math.abs(u) < 1e-6) return P * (ci - co) * (1 + u / 2);
    const e = Math.exp(-u);
    return (P * u * (ci - co * e)) / (1 - e);
  }
  /** GHK current density, A/m², outward positive. */
  const ghkCurrent = (P, z, V, ci, co, T) => z * F * ghkFlux(P, z, V, ci, co, T);

  // ---------- a spherical cell ----------

  const sphere = (radius) => ({
    area: 4 * Math.PI * radius * radius,
    volume: (4 / 3) * Math.PI * radius ** 3,
  });

  /**
   * How many monovalent ions must cross to charge a membrane by dV volts,
   * and what fraction of the cell's own K⁺ that is.
   */
  function chargeLedger(radius, dV, kIn, cm = 0.01) {
    const { area, volume } = sphere(radius);
    const capacitance = cm * area;              // F
    const coulombs = capacitance * Math.abs(dV);
    const ions = coulombs / 1.602176634e-19;
    const kIons = kIn * volume * 6.02214076e23; // mol/m³ · m³ · /mol
    return { capacitance, ions, kIons, fraction: ions / kIons };
  }

  // ---------- the pump–leak cell ----------
  //
  // State: amounts (mol) of Na⁺, K⁺, Cl⁻, Ca²⁺ and the impermeant anion A inside; the bath is
  // fixed. Water follows instantly, so the volume always makes inside osmolarity equal the
  // bath's. Vm is quasi-steady: the voltage at which the net membrane current is zero.
  // The capacitive charge that Vm implies is tiny (see chargeLedger) and is not subtracted
  // from the amounts.

  const ION_Z = { Na: 1, K: 1, Cl: -1, Ca: 2 };

  /** The bath: mammalian-style extracellular fluid, electroneutral, ~300 mOsm. */
  const BATH = { Na: 145, K: 5, Cl: 110, Ca: 2, X: 44 }; // X: impermeant bath anions, valence −1
  // Charge check: 145 + 5 + 2·2 = 154 = 110 + 44. Osmolarity: 306 mOsm.
  const osmolarity = (c) => c.Na + c.K + c.Cl + c.Ca + c.X;

  const defaultCell = () => ({
    radius: 10e-6,
    // Permeabilities, m/s. Illustrative values giving a resting Vm near −70 mV; not fit to any cell.
    P: { K: 3e-8, Na: 0.04 * 3e-8, Cl: 0.1 * 3e-8, Ca: 1e-12 },
    // Na⁺/K⁺-ATPase: maximal current density A/m²; Hill activation by internal Na⁺ (3 sites)
    // and external K⁺ (2 sites). Illustrative.
    pump: { on: true, imax: 0.0, kNa: 10, kK: 1.5 },
    // PMCA: maximal Ca²⁺ extrusion, mol/(m²·s); Hill n = 2, K = 0.2 µM. Electroneutral here
    // (the Ca²⁺/H⁺ exchange is not modeled). Illustrative.
    pmca: { on: true, vmax: 0.0, k: 0.2e-3, n: 2 },
    // Cation–chloride cotransporters: rate constants in mol/s per unit of ln(driving ratio).
    nkcc1: 0,
    kcc2: 0,
    zA: -1,
  });

  /** The Na⁺/K⁺-ATPase cycle rate, mol/s (each cycle: 3 Na⁺ out, 2 K⁺ in, one net + out). */
  function pumpRate(cell, ci, bath, area) {
    if (!cell.pump.on) return 0;
    const fNa = ci.Na ** 3 / (ci.Na ** 3 + cell.pump.kNa ** 3);
    const fK = bath.K ** 2 / (bath.K ** 2 + cell.pump.kK ** 2);
    return (cell.pump.imax * area * fNa * fK) / F;
  }
  function pmcaRate(cell, ci, area) {
    if (!cell.pmca.on) return 0;
    const c = ci.Ca, { k, n } = cell.pmca;
    return cell.pmca.vmax * area * (c ** n / (c ** n + k ** n));
  }
  /** NKCC1, mol/s inward (1 Na⁺, 1 K⁺, 2 Cl⁻ per cycle). Negative means it runs outward. */
  function nkcc1Rate(cell, ci, bath) {
    if (!cell.nkcc1) return 0;
    return cell.nkcc1 * Math.log((bath.Na * bath.K * bath.Cl ** 2) / (ci.Na * ci.K * ci.Cl ** 2));
  }
  /** KCC2, mol/s outward (1 K⁺, 1 Cl⁻ per cycle). Negative means it runs inward. */
  function kcc2Rate(cell, ci, bath) {
    if (!cell.kcc2) return 0;
    return cell.kcc2 * Math.log((ci.K * ci.Cl) / (bath.K * bath.Cl));
  }

  const concentrations = (n, volume) => ({
    Na: n.Na / volume, K: n.K / volume, Cl: n.Cl / volume, Ca: n.Ca / volume, A: n.A / volume,
  });
  const volumeFor = (n, bath) => (n.Na + n.K + n.Cl + n.Ca + n.A) / osmolarity(bath);

  /** Net membrane current (A, outward positive) at V: the leaks plus the pump's net charge. */
  function netCurrent(cell, V, ci, bath, area) {
    let i = 0;
    for (const ion of ["Na", "K", "Cl", "Ca"]) {
      i += area * ghkCurrent(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]);
    }
    return i + F * pumpRate(cell, ci, bath, area);
  }

  /** The Vm at which net current is zero. Current rises monotonically with V, so bisection is safe. */
  function restingV(cell, ci, bath, area) {
    let lo = -0.2, hi = 0.2;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (netCurrent(cell, mid, ci, bath, area) > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  /** Everything a page wants to draw about the cell right now. */
  function snapshot(cell, n, bath = BATH) {
    const { area } = sphere(cell.radius);
    const volume = volumeFor(n, bath);
    const ci = concentrations(n, volume);
    const V = restingV(cell, ci, bath, area);
    const leak = {};
    for (const ion of ["Na", "K", "Cl", "Ca"]) {
      leak[ion] = area * ghkFlux(cell.P[ion], ION_Z[ion], V, ci[ion], bath[ion]); // mol/s, outward
    }
    const pump = pumpRate(cell, ci, bath, area);
    const pmca = pmcaRate(cell, ci, area);
    const nkcc1 = nkcc1Rate(cell, ci, bath);
    const kcc2 = kcc2Rate(cell, ci, bath);
    const E = {};
    for (const ion of ["Na", "K", "Cl", "Ca"]) E[ion] = nernst(ION_Z[ion], bath[ion], ci[ion]);
    // Net outward flux of each ion through every pathway, mol/s.
    const net = {
      Na: leak.Na + 3 * pump - nkcc1,
      K: leak.K - 2 * pump - nkcc1 + kcc2,
      Cl: leak.Cl - 2 * nkcc1 + kcc2,
      Ca: leak.Ca + pmca,
    };
    return { V, ci, volume, area, leak, pump, pmca, nkcc1, kcc2, E, net };
  }

  /** Advance the cell by dt seconds (forward Euler on amounts; dt of seconds is stable here). */
  function step(cell, n, dt, bath = BATH) {
    const s = snapshot(cell, n, bath);
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
   * Amounts for a cell of the given radius holding the given internal concentrations, with
   * the impermeant anion chosen so the inside is electroneutral and isosmotic with the bath.
   * Returns null if those concentrations cannot be both.
   */
  function amountsFor(radius, ci, bath = BATH, zA) {
    const vol = sphere(radius).volume;
    const A = osmolarity(bath) - (ci.Na + ci.K + ci.Cl + ci.Ca);
    const charge = ci.Na + ci.K + 2 * ci.Ca - ci.Cl;          // must be balanced by zA·A
    const z = zA ?? -charge / A;
    if (A <= 0) return null;
    return { n: { Na: ci.Na * vol, K: ci.K * vol, Cl: ci.Cl * vol, Ca: ci.Ca * vol, A: A * vol }, zA: z };
  }

  /** Run to steady state; returns the final amounts and how long it took to settle. */
  function settle(cell, n, { dt = 1, maxT = 2e6, tol = 1e-9, bath = BATH } = {}) {
    let t = 0;
    for (; t < maxT; t += dt) {
      const r = step(cell, n, dt, bath);
      const rel = Math.abs(r.n.Na - n.Na) / n.Na + Math.abs(r.n.K - n.K) / n.K + Math.abs(r.n.Cl - n.Cl) / n.Cl;
      n = r.n;
      if (rel < tol * dt) break;
    }
    return { n, t };
  }

  // ---------- the healthy cell every compartment page starts from ----------
  //
  // Not tuned by hand: solved exactly. Fix Na⁺ 12 mM, K⁺ 140 mM and Ca²⁺ 0.1 µM inside. For
  // Na⁺ and K⁺ to be steady, the pump must return 3 Na⁺ for every 2 K⁺ the leaks carry, which
  // happens at exactly one Vm: 2·leak_Na(V) + 3·leak_K(V) = 0. That Vm fixes the pump's rate
  // (hence its strength), Cl⁻ sits passively at E_Cl = Vm, the PMCA balances the Ca²⁺ leak, and
  // the impermeant anion is whatever makes the inside electroneutral and isosmotic.
  // tests/physics.test.js pins the result.

  const HEALTHY_TARGET = { Na: 12, K: 140, Ca: 1e-4 };

  // Cotransporter strengths that bring the healthy cell's E_Cl to two measured E_GABA values,
  // solved by bisection and pinned in tests/physics.test.js. The cell is generic: these say
  // what transport could produce each value, not what any real cell expresses.
  const CCC_PRESETS = {
    none: { nkcc1: 0, kcc2: 0 },
    cortex: { nkcc1: 0, kcc2: 4.427e-17 },   // E_Cl −80 mV, a conventional adult cortical E_GABA
    gnrh: { nkcc1: 5.792e-17, kcc2: 0 },     // E_Cl −36.5 mV, E_GABA measured in adult mouse GnRH neurons (DeFazio et al. 2002)
  };

  function healthyState(target = HEALTHY_TARGET, bath = BATH) {
    const cell = defaultCell();
    const { area } = sphere(cell.radius);
    const leak = (ion, V, c) => area * ghkFlux(cell.P[ion], ION_Z[ion], V, c, bath[ion]);
    const f = (V) => 2 * leak("Na", V, target.Na) + 3 * leak("K", V, target.K);
    let lo = -0.2, hi = 0.05;
    for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    const V = (lo + hi) / 2;
    const rate = leak("K", V, target.K) / 2;                          // pump cycles, mol/s
    const fNa = target.Na ** 3 / (target.Na ** 3 + cell.pump.kNa ** 3);
    const fK = bath.K ** 2 / (bath.K ** 2 + cell.pump.kK ** 2);
    cell.pump.imax = (rate * F) / (area * fNa * fK);
    const { k, n: h } = cell.pmca;
    cell.pmca.vmax = -leak("Ca", V, target.Ca) / (area * (target.Ca ** h / (target.Ca ** h + k ** h)));
    const Cl = bath.Cl * Math.exp(V / rtf());                        // E_Cl = Vm for z = −1
    const a = amountsFor(cell.radius, { Na: target.Na, K: target.K, Cl, Ca: target.Ca }, bath);
    cell.zA = a.zA;
    return { cell, n: a.n, V };
  }

  // ---------- one compartment, one fast channel (the one-channel and GHK pages) ----------

  /** dV/dt for a membrane with fixed concentrations and given permeabilities (m/s). */
  function dVdt(P, V, ci, co, cm = 0.01) {
    let i = 0;
    for (const ion of Object.keys(P)) i += ghkCurrent(P[ion], ION_Z[ion], V, ci[ion], co[ion]);
    return -i / cm;
  }
  /** GHK slope conductance per unit area (S/m²) near V, for the membrane time constant. */
  function slopeConductance(P, V, ci, co) {
    const h = 1e-5;
    let g = 0;
    for (const ion of Object.keys(P)) {
      g += (ghkCurrent(P[ion], ION_Z[ion], V + h, ci[ion], co[ion]) - ghkCurrent(P[ion], ION_Z[ion], V - h, ci[ion], co[ion])) / (2 * h);
    }
    return g;
  }

  // ---------- particles: the predictions the particle pages are checked against ----------

  function erf(x) {
    // Abramowitz & Stegun 7.1.26; |error| < 1.5e-7, ample for a profile drawn on screen.
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  /**
   * Free diffusion from a step, reflecting walls ignored: fraction of the starting
   * concentration at x when everything began in x < 0.
   */
  const stepProfile = (x, t, D) => (t <= 0 ? (x < 0 ? 1 : 0) : 0.5 * (1 - erf(x / (2 * Math.sqrt(D * t)))));
  /**
   * Diffusion in a box [0, L] with reflecting walls, everything starting in the left half at
   * concentration 1. Exact cosine series: c = ½ + Σ (2/nπ)·sin(nπ/2)·cos(nπx/L)·e^(−(nπ/L)²Dt).
   */
  function boxStepProfile(x, t, D, L, terms = 400) {
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
  /** Fick's flux, J = −D·dc/dx, through the middle of that box (concentration units per m², per s). */
  function boxMidFlux(t, D, L) {
    if (t <= 0) return Infinity;
    const h = L * 1e-4;
    return (-D * (boxStepProfile(L / 2 + h, t, D, L) - boxStepProfile(L / 2 - h, t, D, L))) / (2 * h);
  }
  /** Mean time to diffuse a distance x in one dimension: t = x² / 2D. */
  const diffusionTime1D = (x, D) => (x * x) / (2 * D);
  /**
   * Equilibrium concentration ratio c_out / c_in for an ion of valence z when the inside sits
   * at V volts relative to the outside (the Boltzmann distribution; Nernst read backward).
   */
  const boltzmannRatio = (z, V, T = T37) => Math.exp((z * V) / rtf(T));

  // Free-solution diffusion coefficients at 25 °C, m²/s. TO VERIFY against a cited table
  // (recalled CRC-style values; docs/MILESTONES.md lists the check).
  const D_FREE = { K: 1.96e-9, Na: 1.33e-9, Cl: 2.03e-9, Ca: 0.79e-9 };

  const api = {
    F, R, T37, rtf, ION_Z, BATH, D_FREE, HEALTHY_TARGET, CCC_PRESETS,
    nernst, nernstMv, ghkVoltage, ghkVoltageMv, ghkFlux, ghkCurrent,
    sphere, chargeLedger, osmolarity,
    defaultCell, healthyState, amountsFor, snapshot, step, settle, restingV, netCurrent,
    pumpRate, pmcaRate, nkcc1Rate, kcc2Rate,
    dVdt, slopeConductance,
    erf, stepProfile, boxStepProfile, boxMidFlux, diffusionTime1D, boltzmannRatio,
  };
  return api;
})();

if (typeof module !== "undefined") module.exports = Ions;
