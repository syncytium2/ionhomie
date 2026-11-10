# ADR-0026: Carbonic anhydrase on the dots' scale; its equation in the legend

## Status

Accepted, 2026-11-10. Tony, looking at v0.1.11's protons page: *"add CA to the legend and put the equation there rather
than the cell. CA consumes a lot more bicarb than present in the visual"*. Supersedes the scale part of
[ADR-0025](0025-labels-over-the-ions-and-carbonic-anhydrase-at-its-net.md). The forms are Claude's.

## Context

ADR-0025 drew CA's conversions at a scale of their own, one per billion ions, while each HCO₃⁻ dot in the cell stands for
about 6 billion. At 30 minutes a second CA appeared to use about five HCO₃⁻ a second from a cell that showed about five.
Each scale was stated, but two scales for one ion on one stage is the mismatch ADR-0011 exists to prevent.

## Decision

- **CA moves at the stage's own scale and thinning**, like every crossing. Its net rate (physics.ts, `acid.ca`) becomes
  dots a second exactly as NBC's does, so at rest the two match: an HCO₃⁻ dot comes in through NBC, and one goes back to
  CO₂ at the enzyme.
- **It uses and makes the cell's own HCO₃⁻ dots.** Running back, it takes the nearest free HCO₃⁻ dot, walks it to the
  enzyme, and it leaves as CO₂ across the lipid. Running forward, a CO₂ crosses in and a new HCO₃⁻ dot leaves the enzyme
  (`takeDot`, `letGo` and `addDot` on `CellStage`). The H⁺ it uses or makes shows only for a moment, since the buffers hold
  nearly all of it.
- **A CO₂ step's burst is its true size, unthinned**: about 5.9 billion HCO₃⁻, about one dot. The caption says so.
- **The legend carries CA**: its glyph, "carbonic anhydrase (CA II): CO₂ + H₂O ⇌ H⁺ + HCO₃⁻", and a note that it turns
  over about a million times a second each way, with only the net shown. On the stage it is labeled "CA" only.

## Consequences

At the fast clock most crossings are thinned (1 in several hundred), so CA's conversions are rare there, as NBC's are; at
5 minutes a second they are easy to see. The census view gives the counts.
