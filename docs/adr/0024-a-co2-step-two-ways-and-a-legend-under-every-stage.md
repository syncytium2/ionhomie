# ADR-0024: A CO₂ step, two ways, on the protons page; an ion legend under every stage

## Status

Accepted, 2026-11-10, by Tony, one decision at a time:
- Asked which acid challenge should replace the metabolic acid (removed because it broke electroneutrality): *"A CO₂ step"*.
- Shown that doubling CO₂ alone gives no recovery (pHo falls, and the H⁺ leak grows), while doubling it with pHo held gives
  the classic recovery: *"Both, as two buttons"*.
- Asked whether every chapter with a cell stage should get the ion legend the protons page has: *"Every stage"*.

The forms are Claude's.

## Decision

- **Two buttons on the protons page.** "Double CO₂" raises the bath's CO₂ alone, so pHo falls by log₁₀ 2 (7.3 → 7.0).
  "Double CO₂, pHo held" doubles the bath's HCO₃⁻ as well (25 → 50 mM, replacing Cl⁻ one for one, so the bath stays
  electroneutral and isosmotic). Pressing either again returns the CO₂. In both, CO₂ crosses at once and hydrates to equal
  H⁺ and HCO₃⁻, and only the non-bicarbonate buffers take up the H⁺, so pHi falls at once (7.0 → 6.77;
  `co2Step` in `src/core/physics.ts`).
  - With CO₂ alone, pHi keeps sliding to 6.67 and does not recover: the more acid bath drives more H⁺ in through the
    leak.
  - With pHo held, NHE and NBC bring pHi back to 7.0 over a few hours as HCO₃⁻ inside doubles to 25 mM. The cell swells
    about 8%.
- **An ion legend under every cell stage** (the home page, compartments, one channel, GHK, rundown, pumps, chloride, the
  homeostat, protons): a row of glyphs and names for the ions that page draws (`IonKey` in `src/chapters/parts.tsx`). It
  wraps to two rows on a phone. The diffusion and drift chapters draw particles in a box, not a cell, and have none.

## Consequences

- `scripts/check.mjs` now measures each page from the top. Clicking a control scrolls it into view, and the homeostat's
  legend pushed its run button below a phone's fold.
- The other rulings, recorded here so they sit together: the protons page keeps NHE1, NBCn1, the H⁺ leak and CO₂ with
  carbonic anhydrase (no AE3, NBCe1, MCT or V-ATPase); H⁺ `#cc79a7` and HCO₃⁻ `#e69f00` stay; free H⁺ is shown both
  ways (census dots and the buffer ledger); both cells, with a picker; the page sits after Chloride.
