// protons.ts — Siesjö's figure as a mode of the shared cell, and the arithmetic the protons page quotes
// (docs/adr/0022). The acid–base model itself lives in physics.ts, in the one cell every chapter runs.

import { BATH, ghkFlux, hco3In, hFree, slopeMv, solveAcid, sphere, type Bath, type Cell } from "./physics.ts";

/** The numbers on Siesjö's figure (1985, Prog Brain Res 63:121, Fig. 8, p. 132). V in volts. */
export const SIESJO = { V: -0.06, pHo: 7.3, hco3o: 25, pHi: 7.0, hco3i: 12.5 } as const;

/** pHi at which H⁺ is in equilibrium at Vm (mV): pHo + Vm/S. */
export const passivePHi = (Vmv: number, pHo: number) => pHo + Vmv / slopeMv();
/** E_H in mV. With CO₂ equal on both sides, E_HCO₃ is the same. */
export const eHmv = (pHi: number, pHo: number) => slopeMv() * (pHi - pHo);
/** Ions per µm³ at 1 mM. */
export const PER_UM3_PER_MM = 602214;

/**
 * Siesjö's figure, in the shared cell: Vm held at V by a clamp (K⁺ held too, as in the chloride chapter's recording), and
 * NHE and NBC re-solved so that pHi rests at 7.0 there. Siesjö chose −60 mV "to facilitate calculations" (true values
 * −60 to −90 mV); the free-running cell rests near −80 mV.
 */
export function toSiesjo(cell: Cell, V: number = SIESJO.V, bath: Bath = BATH) {
  cell.clamp = { V, holdK: true };
  const { area } = sphere(cell.radius);
  const ci = { Na: 10, HCO3: hco3In(SIESJO.pHi, bath), H: hFree(SIESJO.pHi), pHi: SIESJO.pHi };
  const hIn = -area * ghkFlux(cell.acid.PH, 1, V, ci.H, hFree(bath.pHo));
  solveAcid(cell, V, ci, bath, hIn);
}
