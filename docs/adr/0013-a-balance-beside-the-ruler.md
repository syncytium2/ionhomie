# ADR-0013: A balance beside the ruler, and a zero line with weight

## Status

Accepted, 2026-10-20. Tony: *"the voltage ruler is cool, but y-axis is sublte and the the zero line really
needs a bit more drama. wonder if a teeter totter is better to show the balancing?"* The forms are Claude's.

## Decision

- **The ruler keeps its job**, showing where Vm sits, with a heavier axis, larger labels, a gridline every
  20 mV, and a solid, labeled 0 mV line; the band above is shaded and labeled "inside positive", the band
  below "inside negative".
- **A teeter-totter shows why Vm holds still**, beside the ruler rather than instead of it:
  - in **one channel**, the ion's gradient (worth E) on one side and the membrane (Vm) on the other; it tilts
    by Vm − E and is level exactly at E;
  - in **GHK**, the outward currents stacked on one side and the inward currents on the other; level when they
    cancel, with both pans still loaded, which is the steady state that is not an equilibrium.

## Consequences

- Other chapters could take a balance later (drift's two fluxes; chloride's GABA driving force); not yet.
