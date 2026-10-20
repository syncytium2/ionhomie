# ADR-0011: Every dot and every crossing is on a stated scale, and the scales agree

## Status

Accepted, 2026-10-20. Tony, reviewing v0.1.1: *"it looks like lots of ions flowing, but they don't match
the perception of ions in the cells. 2 Na+ ions, but a torrent through the leak and pump"*, *"one channel
creates a torrent way out of proportion to the number of ions we see"*, *"is it possible to model it such
that you actually see a Cl- ion go in and out?"*, and *"students are very visual and get thrown off by
mismatches"*. The design below is Claude's; Tony asked for it to be extrapolated from those notes.

## Context

v0.1.1 drew the cell's dots from the concentrations but the moving tokens on a separate square-root
"relative rate" scale, chosen to look busy. The two disagreed by orders of magnitude, and a student
reading the picture would learn the wrong thing. [ADR-0004](0004-the-physics-computes-the-particles-depict.md)
said the particles depict the model; the fluxes did not.

## Decision

Two scales, both printed on every stage, and consistent with each other and with the physics:

- **Bulk: each dot ≈ 10¹⁰ ions** (the exact figure depends on the stage's size and is printed). Where the
  cell runs for minutes (home, rundown, pumps, chloride), the inside counts are the cell's real amounts, and
  only crossings change them. **A crossing moves an actual dot** through its pathway, at the model's one-way
  rate × the clock speed. Leaks cross both ways at once (the GHK flux split into its efflux and influx,
  `ghkUnidirectional`), so a passively distributed ion such as Cl⁻ is seen crossing in and out in equal
  numbers. The pump moves 3 Na⁺ out and 2 K⁺ in as one cycle; NKCC1 (1 Na⁺, 1 K⁺, 2 Cl⁻ in) and KCC2 (1 K⁺,
  1 Cl⁻ out) move their ions together. When rounding drifts a count, the correction is a visible crossing
  through that ion's own leak, never a dot appearing from nowhere. The bath is a reservoir held at its
  concentration, topped up at the canvas edges.
- **Membrane charge: each ± ≈ 110,000 ions.** A rim of + and − on the two faces of the membrane, sized by Vm,
  on every compartment stage. Where Vm changes in milliseconds and the bulk cannot (one channel, GHK),
  crossings are drawn at this scale as rings and join the rim; their total is exactly the charge Vm needs,
  and at E they keep crossing equally both ways.
- **When the clock is fast**, the true one-way rates outrun the eye. Then 1 in *k* crossings are shown, in both
  directions alike (so the ratio of in to out is kept), and the stage says so.
- **Ca²⁺ is not drawn**: at 0.1 µM the cell holds a few thousandths of a dot. Its story is told on the ruler,
  the gauges and its own trace.
- **Motion between crossings is depiction**: a slow, smooth wander instead of a per-frame jiggle. In the two
  chapters where the random walk *is* the model (diffusion, drift), the walk is sampled 12 times a real second
  and each dot glides between true samples, so slowing the clock calms the jitter too; "show every frame"
  restores every step.

## Consequences

- The torrents are gone: on the home page about one dot a second crosses each leak, and the pool of 2–3 Na⁺
  dots inside visibly turns over through the leak and the pump.
- `scripts/check.mjs` fails a stage that draws almost no ions. It was added after the wander's first frame,
  with a negative time step, turned every dot into NaN at phone width; breaking the stage on purpose was
  checked to turn the check red.
