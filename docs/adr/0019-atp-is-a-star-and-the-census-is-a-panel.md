# ADR-0019: ATP is a star in a star-shaped site; the census is a panel like the magnifier

## Status

Accepted, 2026-10-22, by Tony. Supersedes the cytoplasmic-domain "lobe" of [ADR-0018](0018-the-pump-carries-its-atp.md) and the
isometric cubes of [ADR-0016](0016-the-learner-picks-how-the-stage-shows-concentrations.md)'s census; the rest of both stands.

Tony: *"the blobs hanging off the pumps are very weird looking ... i was thinking more like an ATP in waiting maybe star shaped,
and a star shaped cutout on the pump, atp binds, pump gets a P, and the star becomes something else."* And, on the census and
magnifier: *"these two should share a similar layout. the magnifier look i prefer. i like the 3D but nothing we do is 3D (is
it?). convert the census to the magnifier style."* Nothing else in the app is 3D; the cubes were drawn in perspective, and
[ADR-0005](0005-two-dimensions-first.md) keeps every working view 2D.

## Decision

- **The pump has a star-shaped cutout**, the ATP site, at one corner of its cytoplasmic face, clear of the binding cleft. A yellow
  five-pointed **ATP star** sits docked in it while the pump waits for Na⁺. As the pump closes on its Na⁺ the star breaks: one
  point stays on as the yellow **P** (at the mirror corner), and the rest, a **four-pointed ADP star**, drifts off into the
  cytoplasm. The cutout shows empty and a fresh ATP star waits beside it in the cytoplasm, docking when the pump has delivered its
  K⁺ and faced in again. PMCA, also a P-type ATPase, does the same in time with its rock. A stopped pump shows no ATP.
- **The census uses the magnifier's layout**: the cell moves left with a square marker on its membrane, and a panel shows one cubic
  micrometer on each side of the membrane. Inside, every free Ca²⁺ is drawn, one ring per ion (60 at rest); outside, 1.5 million,
  as a haze. The other ions' counts sit at the foot of each half.

Also from this review: the NKCC1 and KCC2 sliders show a unit, the transporter's capacity in femtomoles per second per unit of
ln(driving ratio); and the homeostat's stage takes the room the screen allows (*"lets give the main display more space"*).

## Consequences

- The tonydefazio.com tile's pump follows (star site, ATP and ADP stars, P), from `scripts/tile-svg.ts`.
