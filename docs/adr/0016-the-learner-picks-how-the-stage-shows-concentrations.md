# ADR-0016: The learner picks how the stage shows concentrations

## Status

Accepted, 2026-10-21, by Tony, choosing among three drafted options: *"i like all of them. let's let the user
decide what works best for them"*. The forms are Claude's, from the drafts in
[`feedback/drafts/`](../feedback/drafts/) ([second look](../feedback/2026-10-20-second-look.md)).

## Context

One dot scale (~10¹⁰ ions, [ADR-0011](0011-every-dot-and-crossing-is-on-a-stated-scale.md)) cannot show every
gradient: inside, Na⁺ is ~3 dots, Cl⁻ ~2, and free Ca²⁺ a few thousandths of a dot, though free Ca²⁺ is
crucial to a neuron. Tony asked for a way to see the concentrations inside and out *"but keep a degree of
realism."*

## Decision

Every cell stage carries a **View** control directly under it (controls under the action, ADR-0008). The choice
is one setting for every stage, kept in the viewer's browser (`localStorage`, with the cell view if storage is
blocked). Every view is drawn live from the model's current concentrations, and prints its own scale.

- **Cell** (the default): the stage as before, every ion on one scale, crossings as real dots.
- **One ion** (Na⁺, K⁺, Cl⁻ or Ca²⁺): that ion alone on its own scale, chosen so the dilute side holds about a
  dozen dots; the concentrated side is dots while it fits (up to 1,400) and otherwise a haze with its ratio
  printed ("outside: 25,000× denser than inside, drawn as a haze"). Other ions fade; crossings, drawn at the bulk
  scale, are hidden, since they would contradict the view's own scale. The scale is printed: Ca²⁺ ≈ 21,000 ions
  per dot, Na⁺ ≈ 2 billion.
- **Census, 1 µm³**: real counts in one cubic micrometer inside and out (1 mM = 602,214 ions per µm³). Inside,
  every free Ca²⁺ is drawn, 60 at rest; outside, 1.5 million, as a haze. Every ion's counts on a log scale.
- **Magnifier**: a lens on the membrane showing a 100 nm cube on each side at 500 ions per dot. Inside, free Ca²⁺
  averages 0.06 ions, so it is usually absent; a single visiting ion (Poisson occupancy, resampled every 1.5 s)
  is drawn as a ring, not a dot, and the key says so. Outside, about 1,500 Ca²⁺: 3 dots.

## Consequences

- The views change with the model: switch off the PMCA in the pumps chapter and the census cube fills with Ca²⁺;
  in rundown the magnifier's inside fills with Na⁺.
- `scripts/check.mjs` drives every view on a running cell (pumps) and a fixed one (compartments) at both widths,
  and fails on any error.
- The squid preset in the GHK chapter has no Ca²⁺; the census and magnifier leave its Ca²⁺ out.
