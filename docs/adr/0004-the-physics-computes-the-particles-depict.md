# ADR-0004: The physics computes; the particles only depict it

## Status

Proposed, 2026-10-19, by Claude. Tony has not ruled.

## Context

Colored particles are what make the tool visual, and the brief asks for it to be heavily
visual. But a membrane potential needs very little charge. For a spherical cell 10 µm in
radius with 1 µF/cm² membrane, the capacitance is about 12.6 pF, and charging it by 100 mV
moves about 7.8 × 10⁶ monovalent ions. The same cell holds about 3.5 × 10¹¹ K⁺ at 140 mM:
roughly one ion in 45,000. With a few thousand particles on screen, a 100 mV swing is a
small fraction of one particle.

If Vm were computed from the drawn particles, the tool would either be wrong by orders of
magnitude or would teach the commonest misconception in the subject: that changing the
potential takes a large movement of ions.

## Decision

- **From the compartments chapter on, the state is a compartment model**: continuous
  concentrations per compartment, flux per pathway by the GHK flux equation (or each
  transporter's own rate law), and the membrane as a capacitor, V = Q/C.
- **Particles are a view of that state**: their density follows the computed
  concentrations, and their drift follows the computed fluxes.
- **The excess charge that sets Vm is shown in its own magnified inset, the charge ledger**,
  on its own scale, beside a readout of how little the bulk concentrations changed.
- **The exception is the diffusion chapter**, where a true random walk is the honest model
  and is exactly what runs. The drift chapter may also run particles directly, since it has no
  membrane potential to get wrong.

## Consequences

- The charge ledger becomes a teaching moment rather than a hidden simplification.
- Particle counts are free to be chosen for legibility, not physics.
- Membrane potential and concentration move on very different timescales (milliseconds versus
  minutes to hours), so the integrator treats them as a stiff pair: Vm quasi-steady, or an
  implicit step. The clock's speed-up is always on screen.
