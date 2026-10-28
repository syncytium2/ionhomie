# ADR-0020: A crossed dot wanders off before it crosses again, and scarce dots set the thinning

## Status

Proposed, 2026-10-28 (Tony reported the problem; the fix is Claude's). Amends
[ADR-0011](0011-every-dot-and-crossing-is-on-a-stated-scale.md)'s thinning rule; the rest of it stands.

Tony, on v0.1.7: *"the ionhomie home page is nice the ions flow nicely, but the other pages the ions are trapped moving in
and out of the channel rather than diffusing into the cell / extracellular space"*.

## What was wrong

Measured in the running app (a debug hook, 20 s per page, v0.1.7): on Home, Rundown, Pumps and Chloride, 59–71% of leak
crossings were made by a dot that had crossed less than 10 s before; the median gap was the 3 s rest. On the homeostat it was
21%. Two causes:

- **The scarce side cannot supply the shown rate.** The stage holds ~5–10 Na⁺ and Cl⁻ dots inside the cell and ~10–17 K⁺ dots
  outside. At up to 6 shown crossings per second per direction, those few dots must be reused every second or two, whatever
  the rest rule.
- **Dots wandered slowly** (9 px/√s everywhere but the homeostat's 26), so a crossed dot was still near the pore, and nearest,
  when the next crossing picked a dot.

## Decision

- **A crossed dot must wander 50 px (× the stage scale) from the membrane before it can cross again**, or wait 15 s. This
  replaces the 3 s rest, on every crossing: leaks, pumps and cotransporters.
- **The thinning also counts the dots on each side.** Besides the fastest one-way rate (≤ 6 per s) and the protein cycle rate,
  the lab thins so that no source side is drawn on faster than once per dot per 6 s. Both directions are still thinned alike,
  and the stage still says "1 in k crossings shown", so the ratio of in to out is kept and the stated scale stays true.
- **Every stage wanders at 26 px/√s**, the homeostat's rate, so crossed dots spread into the cell and the bath.

## Consequences

- Reuse within 10 s fell from 59–71% to ~30% on those pages (the homeostat's level), and the dots' paths, traced over
  12 s, now reach into the cell and the bath instead of bundling at each pore.
- Fewer leak crossings show at a time (~3 per s on the pumps page, from ~6–7); the "1 in k" tag rises to say so.
- `CellStage.dotsOf(ion, side)` is new; `Lab.flows` uses it.
