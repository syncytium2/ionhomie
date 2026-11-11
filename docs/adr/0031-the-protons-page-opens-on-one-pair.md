# ADR-0031: The protons page opens on one pair, then the enzyme as a blur, then mass action

## Status

Accepted, 2026-11-11 (Tony). Supersedes the step order of [ADR-0030](0030-the-protons-page-opens-on-the-reaction-then-adds-the-enzyme.md).

Tony: *"start even simpler. one proton one bicarb combine to make water and c02. then have them reverse a moment later. now add
CA and the forward and backward reaction goes so fast its a blur. with a slider to slow it down. then the mass action slides, then
the detailed ca with zinc"*.

## Decision

The steps, in order:

1. **One H⁺ meets one HCO₃⁻**: a single pair, drawn atom by atom (`src/views/pair-view.ts`). The H⁺ joins the HCO₃⁻, which falls
   apart into CO₂ and water (the water keeps the H⁺ and one of bicarbonate's oxygens). A moment later the pair reverses. The
   equation above lights the side the pair is on. Pause and Again.
2. **Add the enzyme**: the same pair, on a plain shape labeled carbonic anhydrase, running 10,000 times faster (2,500 round trips
   a second): a blur. The blur is motion blur: each frame layers many moments of the time it covers, at random offsets so it never
   strobes into a still. A **Slow motion** slider (0 to 1/10,000, log scale, as in ADR-0030) slows the clock; at 1/10,000 the
   pair runs at the first step's pace. The canvas always states the factor and the round trips.
3. **Many at once: mass action**: the box with the seesaw and dials (ADR-0029), in plain solution with no enzyme, as the old
   opening step. Its text now says what mass action is and that the enzyme would leave the seesaw where it is.
4. **The enzyme up close**: the zinc and the cleft (ADR-0028), unchanged.
5. **Buffers, and the enzyme's speed**, then **the whole cell**: unchanged.

## Consequences

- The pair is an animation, not a model. Its pace (a round trip every 4 s) is chosen to be watched, and the page says so. Only
  the factor of 10,000 between the pair's two steps is a number from the model, and it is the box's illustrative CA_CELL, still
  unsourced. Real molecules in plain water react far less often and do not take turns; the page says that too.
- The box step that added the enzyme to plain solution (ADR-0030's second step) is gone; its slider moved to the pair.
  `ReactionBox` keeps its `timeScale` and `maxShown` fields at their defaults; nothing sets them now.
- `scripts/check.mjs` drives the new order, saves a screenshot of the blur, and checks that the slider reads 1/1,000.
