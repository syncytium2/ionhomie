# ADR-0017: Transport proteins rock between faces; they do not spin

## Status

Accepted, 2026-10-22. Tony: *"i thought we had animated the pumps and transporters more realistically"*, after the
alternating-access animation had been advised (2026-10-20) and listed as waiting on him. The form is Claude's, as
advised then.

## Context

The pump and PMCA were drawn as spinning rotors, which suggests ATP synthase, a protein that does rotate. NKCC1 and
KCC2 were plain blocks; ions slid through all of them. The ion groups were already right ([ADR-0011](0011-every-dot-and-crossing-is-on-a-stated-scale.md):
3 Na⁺ out and 2 K⁺ in per pump cycle; 1 Na⁺, 1 K⁺, 2 Cl⁻ for NKCC1; 1 K⁺, 1 Cl⁻ for KCC2).

## Decision

Every pump and cotransporter is drawn as **alternating access**: a body with a binding cleft open to one face.

- **Bind**: the cleft shows one outlined slot per ion of the half-cycle, in the ions' colors. Ions bind one at a time as
  each comes near (within ~80 px of the cleft, the reach widening slowly while a slot stays empty), walking over at a
  dot's pace. Nothing moves on until every slot is full: a half-filled NKCC1 waits.
- **Close**: the cleft closes around them (occluded). On the Na⁺/K⁺ pump, **ATP → ADP** flashes here: the visible
  difference between a pump and a cotransporter.
- **Rock**: the body tilts and its cleft reopens on the other face.
- **Release**: the ions leave one at a time, moving away from the membrane.
- The pump runs both halves (3 Na⁺ out, then 2 K⁺ in); a cotransporter runs one and rocks back empty; a negative driving
  force runs it in reverse. PMCA, whose Ca²⁺ is too dilute to draw, rocks at its rate without ions.
- A protein shows about one cycle every 3 s. Where the model's cycle rate is faster, the stage shows 1 in *k* of
  everything, crossings and cycles alike, and says so (the existing thinning, now also bounded by cycles).

## Consequences

- The tile on tonydefazio.com drew the old rotor; `scripts/tile-svg.ts` now draws the rocker on the loop's pump cycle,
  and the copy there must be swapped (MILESTONES).
- Where a cycle waits for a scarce ion (the pump's 2 K⁺ from a 5 mM bath), the drawn counts can lag the model briefly; the
  stage's count correction then shows as crossings through the ion's own leak, as before.
