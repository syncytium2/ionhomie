// reaction.ts — the reaction on its own, in a sealed box of solution at 37 °C (docs/adr/0027):
// CO₂ + H₂O ⇌ H⁺ + HCO₃⁻, with or without a buffer, with or without carbonic anhydrase. No cell, no membrane.
// Concentrations in mM. Water is the solvent: its activity, about 1, is folded into K.

/** [H⁺][HCO₃⁻]/[CO₂] at equilibrium, mM (pK 6.1, as the shared cell uses). */
export const K = 10 ** -6.1 * 1e3;
/** Uncatalyzed hydration of CO₂, s⁻¹. Illustrative until sourced (ADR-0027, open). */
export const KH = 0.13;
/** Uncatalyzed dehydration, mM⁻¹ s⁻¹, so that the two directions balance at K. */
export const KD = KH / K;
/** The buffer of the buffers step: a weak acid, total and dissociation constant in mM (25 mM, pK 6.9; illustrative). */
export const BUFFER = { total: 25, K: 10 ** -6.9 * 1e3 };
/** Carbonic anhydrase as a cell has it: it multiplies both directions by this (illustrative order of magnitude). */
export const CA_CELL = 1e4;
/** The box at rest: CO₂ 1.2 mM and HCO₃⁻ 24 mM, which put it at pH 7.40. */
export const START = { co2: 1.2, hco3: 24 };

/** The box: CO₂, HCO₃⁻, and all the acid in it (free H⁺ plus what the buffer holds). */
export interface Box { co2: number; hco3: number; acid: number; buffered: boolean }

const bound = (h: number, buffered: boolean) => (buffered ? (BUFFER.total * h) / (h + BUFFER.K) : 0);
/** Free H⁺ (mM) for a given total acid: the buffer, when there is one, holds the rest. */
export function freeH(b: Box, acid = b.acid): number {
  if (!b.buffered) return acid;
  let lo = 0, hi = acid;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; m + bound(m, true) > acid ? (hi = m) : (lo = m); }
  return (lo + hi) / 2;
}
/** H⁺ the buffer holds, mM. */
export const boundH = (b: Box) => bound(freeH(b), b.buffered);
export const pH = (b: Box) => -Math.log10(freeH(b) / 1e3);
/** A box at equilibrium at the resting CO₂ and HCO₃⁻. */
export function rest(buffered: boolean): Box {
  const h = (K * START.co2) / START.hco3;
  return { co2: START.co2, hco3: START.hco3, acid: h + bound(h, buffered), buffered };
}
/** The net amount (mM) that must convert forward, CO₂ → HCO₃⁻ + H⁺, to bring the box to equilibrium (negative: backward). */
export function toEq(b: Box): number {
  const g = (x: number) => freeH(b, b.acid + x) * (b.hco3 + x) - K * (b.co2 - x);
  let lo = -Math.min(b.hco3, b.acid) + 1e-12, hi = b.co2 - 1e-12;
  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; g(m) > 0 ? (hi = m) : (lo = m); }
  return (lo + hi) / 2;
}
/** Each direction's rate, mM/s, with carbonic anhydrase multiplying both by ca (1: no enzyme). */
export function rates(b: Box, ca: number) {
  return { f: ca * KH * b.co2, b: ca * KD * freeH(b) * b.hco3 };
}
/**
 * Run the box for dt seconds: it relaxes toward equilibrium at the rate its kinetics set, which stays stable at any
 * enzyme level. Returns the net converted forward (mM).
 */
export function relax(b: Box, dt: number, ca: number): number {
  const x = toEq(b), r = rates(b, ca);
  const lam = Math.abs(x) > 1e-15 && Math.abs(r.f - r.b) > 1e-15 ? Math.abs((r.f - r.b) / x) : 2 * ca * KH;
  const dx = x * (1 - Math.exp(-Math.min(50, lam * dt)));
  b.co2 -= dx; b.hco3 += dx; b.acid += dx;
  return dx;
}
