# ADR-0028: The step-through opens on the enzyme, simply

## Status

Accepted, 2026-11-10. Tony: *"i want to try starting with animating it from the point of view of the enzyme"*. Shown a detailed
active site, he said: *"keep this in our back pocket for now. i feel like we need a simple start, this has tons of elements to
distract and overwhelm the student. i think start with a glob based on the paper with HCO3- and CO2 (as in Fig 4A), and water
(Fig 1) roughly shown. Start with the simple reaction CO2 and H20 bind (animate) -> CA "turns over" and out comes proton and
bicarb"*. Then, on the simple mockup: *"for the legend show the molecule ... there's no solo circle in fig. also run it
backwards, or reverse button?"*, and *"maybe hide the extra water and co2 for simple. ca over the bidirectional arrows. then
build"*. The forms are Claude's.

## Decision

- **The protons page's step-through opens on one carbonic anhydrase**, drawn as a glob after Domsic et al. 2008
  (doi:10.1074/jbc.M805353200): the protein and its cleft (Fig. 1a), CO₂ on the oily green surface and HCO₃⁻ on the watery side
  (Fig. 4a), a chain of waters on that side (Fig. 1), the zinc on three histidines. CO₂ and a water bind, the enzyme turns over,
  H⁺ and HCO₃⁻ leave. **Forward and Backward** run the same steps either way: the enzyme has no direction of its own.
- **Simple by design.** No drifting molecules in the solution. The equation sits above, with CA over its arrows, and lights the
  side that is happening. The legend draws each molecule as the picture does (O=C=O, a bent water, a three-armed HCO₃⁻); only H⁺,
  a lone proton, is a lone circle.
- **It is an animation, not a model**, and says so: no rates, molecules drawn far too large, and the order compressed (in the real
  enzyme the water is on the zinc first and gives up its H⁺ in a separate half-cycle).
- **Water is drawn in its own pale blue** (`--water`, #a9c7de), not the mockup's #56b4e9, which is K⁺.
- **The detailed active site is kept back**, unbuilt: `docs/feedback/drafts/protons-steps/enzyme.html` (His64 and the water wire,
  the four-state cycle in both directions, one enzyme left to chance, sixty zoomed out; forward:backward turns =
  K·[CO₂]/([H⁺][HCO₃⁻])).
- **Built now, in order:** the enzyme; the reaction in a box (no enzyme); buffers, and the enzyme's speed; the whole cell, as the
  page was. ADR-0027's three middle steps (the pump and NHE1, NBC, the proton leak) are not built yet: they need the whole cell to
  show only some of its players.
- **`#/protons/whole` opens straight on the whole cell**, so a link from elsewhere (sour's Siesjö preset) can skip the steps.
  `#/protons` opens on the enzyme.

## Consequences

- The reaction box's numbers are pinned in `src/core/reaction.test.ts`; its rate constants stay illustrative (ADR-0027, open).
- sour's link to `#/protons` now lands on the enzyme, not Siesjö's figure, until it is changed to `#/protons/whole`.
