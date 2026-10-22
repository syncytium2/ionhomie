# ADR-0018: The pump carries its ATP; transporters are gray; binding sites always show

## Status

Accepted, 2026-10-22. Tony: *"we need to distinguish the transporters from the pump. ATP just flashes for a moment think of
how to show it continuously. binding sites on all three should persist with hollow rings."* and *"kcc2 is the same color as
chloride i think"*. The forms are Claude's. Builds on [ADR-0017](0017-transport-proteins-rock-they-do-not-spin.md).

## Decision

- **The P-type ATPases (the Na⁺/K⁺ pump and PMCA) have a cytoplasmic domain**, a lobe hanging into the cell, where the
  nucleotide binds. Cotransporters have none. That lobe and what sits in it are how the eye tells a pump from a transporter.
- **ATP is always visible on a pump.** It rests docked in the lobe. As the pump closes on its Na⁺ the ATP splits: ADP drifts
  away into the cytoplasm and a yellow **P** stays on the pump while it faces outward; the site shows empty (dashed). When the
  pump has delivered its K⁺ and faces in again, the P goes and a fresh ATP slides in. A stopped pump (ouabain) shows the site
  empty. The pump rests open to the cytoplasm with ATP bound, waiting for Na⁺.
- **Binding sites persist as hollow rings** in the ions' colors on every transport protein, whether or not they are filled:
  3 Na⁺ (pump facing in), 2 K⁺ (pump facing out), Na⁺ K⁺ Cl⁻ Cl⁻ (NKCC1), K⁺ Cl⁻ (KCC2), Ca²⁺ (PMCA). A bound ion fills its ring.
- **The cotransporters share one cool gray** (#8e9aaf) that no ion uses. KCC2 was nearly the color of Cl⁻, and NKCC1 of Ca²⁺.
  Their labels and rings tell them apart.

Two stage fixes from the same review:

- *"chloride ions never leave the chloride leak channel"*: with Cl⁻ at its reversal potential crossing equally both ways and only
  ~2 Cl⁻ dots inside, the nearest dot to the pore was always the one that had just come through. A dot that has crossed now
  rests ~3 s before it can cross again, by any pathway.
- *"the pore is a black rectangle that some ions can hide behind or get cutoff"*: the membrane, its charge and its proteins are
  drawn first and every ion on top.

## Consequences

- The tonydefazio.com tile's pump follows: lobe, docked ATP, ADP leaving, P, rings (`scripts/tile-svg.ts`).
