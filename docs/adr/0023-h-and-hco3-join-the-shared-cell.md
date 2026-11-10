# ADR-0023: H⁺ and HCO₃⁻ join the shared cell

## Status

Accepted, 2026-11-10, by Tony. Asked, one decision at a time, whether the protons page should keep its own small pH
model or fold H⁺ and HCO₃⁻ into the shared running cell, and given the pros and cons (then a correction: the shared cell
could take Siesjö's bath and pHi, and differ from his figure only in Vm), he answered *"fold in now. revise the core
model"*. Supersedes the separate-model part of [ADR-0022](0022-a-protons-page-after-chloride-on-siesjos-cell.md). The rate
laws, the leak's size and the split between NHE and NBC are Claude's; Tony has not ruled on them.

## Context

ADR-0022 built the protons page on its own model, with Vm set by a slider and Na⁺ fixed. That kept the shared cell and its
pinned numbers untouched, but it was a second model of "the cell", and NHE and NBC could not feel the Na⁺ gradient the
pump builds and the rundown chapter loses.

## Decision

- **The bath** splits its 49 mM of "other anions" into HCO₃⁻ 25 mM and X⁻ 24 mM, at pHo 7.3 (Siesjö's extracellular
  values). It stays electroneutral at 307.5 mOsm.
- **The state gains pHi.** CO₂ is equal on both sides and carbonic anhydrase is treated as instant, so [HCO₃⁻]i follows
  pHi and E_HCO₃ = E_H. Acid that enters is buffered: β = β_i (10 mM per pH unit) + 2.3·[HCO₃⁻]i. HCO₃⁻ takes its share of
  the osmolarity, so the volume follows pHi a little.
- **An H⁺ leak** (GHK, permeability 7 × 10⁻⁵ m/s, illustrative) is the standing acid load, about 0.18 mM/min at rest. Its
  current is in the zero-current solve.
- **NHE1** (1 Na⁺ in, 1 H⁺ out) and **NBC**, taken as the electroneutral NBCn1 (1 Na⁺ and 1 HCO₃⁻ in), run at
  k·area·act(pHi)·ln(driving ratio), with act(pHi) = 1/(1 + 10^(2(pHi − 6.9))). They run on the Na⁺ gradient and stop or
  reverse as thermodynamics allows. NHE carries 60% of the resting extrusion (NHE_SHARE, illustrative).
- **The healthy cell is still solved exactly.** pHi rests at 7.0 (Siesjö's measured value). The pump returns the Na⁺
  that NHE and NBC bring in, so the Vm solve becomes 2·leak_Na + 3·leak_K − 6·ncx − 2·hIn = 0. At that Vm the H⁺ leak's
  inward current is repaid exactly, and the net current is zero.
- **No metabolic acid.** Made inside without its anion, it breaks electroneutrality: NHE swaps the H⁺ for Na⁺, the pump
  swaps that for K⁺, and K⁺ piles up without limit (tried: 173 mM and 1.21× volume after 4 hours). A charge-balanced
  acid challenge (a CO₂ step, or lactate with MCT) is left for Tony to choose.
- **Siesjö's figure is a mode of the same cell.** A clamp holds Vm at −60 mV (K⁺ held, as in the chloride chapter's
  recording), and NHE and NBC are re-solved to hold pHi at 7.0 there (`src/core/protons.ts`).

## Consequences

The pinned numbers moved, all for the same two reasons: the H⁺ leak's current, and the Na⁺ that NHE and NBC load the pump
with.

| | before | now |
|---|---|---|
| healthy Vm | −80.35 mV | −80.08 mV |
| passive Cl⁻ inside | 5.24 mM | 5.30 mM |
| pump current | 11.08 pA | 11.45 pA |
| Vm the instant the pump stops | −77.78 mV | −77.45 mV (share still 2.6 mV) |
| 30 min without the pump: Na⁺, K⁺, Vm, volume | 114.2, 36.1, −45.2, 1.093 | 115.2, 34.5, −44.0, 1.096 |
| Ca²⁺ after 30 min of ouabain | 2.6 µM | 2.73 µM |
| KCC2 preset (E_Cl −85 mV) | 2.481 × 10⁻¹⁶ | 2.603 × 10⁻¹⁶ (re-solved) |
| NKCC1 preset (E_Cl −36.5 mV) | 2.8566 × 10⁻¹⁶ | 2.7152 × 10⁻¹⁶ (re-solved) |
| recording preset (10× KCC2) | 2.481 × 10⁻¹⁵ | 2.603 × 10⁻¹⁵ |
| clamped, bath K⁺ 15 mM: E_Cl | −62.6 mV | −62.5 mV |
| free-running E_Cl shift, bath K⁺ 5 → 15 mM | 21.7 mV | 21.5 mV |

- The cotransporter presets were re-solved so that the chloride chapter still quotes −85 and −36.5 mV. The chloride page's
  "5.2 mM" passive Cl⁻ now reads 5.3. That page was under Tony's review when this changed, so the change is flagged to
  him, not made silently.
- Stopping NHE and NBC takes the free-running cell to its passive pHi, 6.0, in about three hours; in Siesjö's mode, to
  6.32.
- **Rundown does not acidify this cell** (pHi 7.02 after 2 hours without the pump): depolarization cuts the H⁺ leak about
  as much as the failing Na⁺ gradient slows NHE. That contradicts the 2026-11-10 handoff's expectation. In this model,
  the acidosis of ischemia needs lactic acid, which is left out.
- The other chapters' views do not show H⁺ or HCO₃⁻ (`Lab` strips them unless a page asks), and the protons page does not
  show Ca²⁺.
