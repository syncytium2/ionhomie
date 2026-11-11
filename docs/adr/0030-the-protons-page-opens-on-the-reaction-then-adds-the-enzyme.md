# ADR-0030: The protons page opens on the reaction, then adds the enzyme with a slow-motion slider

## Status

Accepted, 2026-11-11 (Tony). Amends the step order of [ADR-0028](0028-the-step-through-opens-on-the-enzyme.md).

Tony: *"lets start the proton page with just the equation and the animaltion (no CA). then add CA and make it run much faster,
so the user has to drag a slider to slow it down to watch"*. Asked where the enzyme close-up goes, he chose "right after CA is
added". This settles the paused discussion in the 2026-11-10 protons handoff about combining the reaction and buffer steps.

## Decision

The steps, in order:

1. **The reaction**: the box of plain solution, with no enzyme and no buffer, plus the equation, the seesaw and the dials.
2. **Add the enzyme**: the same box with carbonic anhydrase (×10,000, both directions). At real time the box flickers: up to
   about 30 shown conversions a second each way, each animated faster, and thinned alike beyond that, as the box says. A
   **Slow motion** slider slows the box's clock on a log scale from real time to 1/10,000, and the box always shows the factor.
   At 1/10,000 it looks as plain solution did at real time. The seesaw stays level throughout: the enzyme changes how fast, not
   where.
3. **The enzyme up close**: the existing one-molecule animation (Domsic et al. 2008).
4. **Buffers, and the enzyme's speed**: unchanged. This is where a CO₂ push converts enough to see, so the enzyme's effect on
   how long a push takes shows here.
5. **The whole cell**: unchanged, still at `#/protons/whole`.

## Consequences

- `ReactionBox` gains `timeScale` (model seconds per real second) and `maxShown` (the cap on shown conversions). The dots'
  drifting stays at real speed, as a picture. The other steps keep 2.5 shown per second and real time.
- In plain solution a push converts only nanomolar amounts, with or without the enzyme (pinned in `reaction.test.ts`). The
  enzyme step therefore shows the enzyme's traffic at equilibrium, not a push. The page says that the buffers step is where
  pushes become visible.
- No new physics. The ×10,000 factor and the uncatalyzed 0.13 s⁻¹ are still illustrative and unsourced, as before.
- `scripts/check.mjs` drives the new order and checks that the slider reads 1/1,000 when set there.
