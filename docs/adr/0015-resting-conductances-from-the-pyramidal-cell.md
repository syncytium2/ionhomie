# ADR-0015: Resting conductances come from gaba_excites's pyramidal cell

## Status

Accepted in part, 2026-10-20. Tony decided the source: *"There are three models in gaba and more coming.
Maybe treat the pyramidal cell as a generic source for channels. I don't see a benefit to selecting the
neuron model here."* The rest (how the channels enter ionhomie) is Claude's proposal, not ruled on and not
built. Numbered 0015 because the homeostat branch holds 0014.

## Context

Tony's thought, 2026-10-20: *"I think of leak as two pore domain potassium channels plus voltage gated ion
channels that have a low but non zero open probability at rest"*, and *"Look at the gaba website. You can
change input resistance with gaba glutamate or sodium or potassium channels. And it depends on vm."*

Today every "leak" in ionhomie is a constant GHK permeability (pK : pNa : pCl = 1 : 0.02 : 0.5 at all
voltages). That is right for K2P channels (open rectifiers follow GHK) and wrong for the voltage-gated part,
whose open probability, and so whose share of the resting permeability, moves with Vm. `gaba_excites` already
measures input resistance as 1 / slope of the steady-state I–V at rest with every channel at its steady-state
open fraction, and finds rest as the most hyperpolarized zero of that curve (`src/core/cell.ts`: `iSteady`,
`steadyV`, `rinAt`), which copes with a Na⁺ window current's second zero.

## Decision

- **The channel source is the regular-spiking pyramidal cell** of `gaba_excites` (Pospischil et al. 2008,
  ModelDB 123623, the model checked against NEURON there): Traub transient Na⁺ (50 mS/cm²), delayed-rectifier
  K⁺ (5 mS/cm²) and M-type K⁺ (0.07 mS/cm²). **No neuron model is selectable in ionhomie.**
- **Vendored, not rewritten**: the channel definitions are copied from `gaba_excites/src/core/channels.ts`,
  stamped `vendored from gaba_excites @ <sha>` (the estate's rule for one source distributed on purpose),
  starting from `b162f87`.

Proposed with it (Claude; to be ruled on when built):

- Each ion's resting permeability becomes P(V) = P_K2P or residual leak + Σ P_max·Po∞(V) + tonic synaptic
  (GABA_A → Cl⁻; glutamate, mixed → Na⁺ and K⁺). Densities are per area, scaled to ionhomie's 10 µm cell, as
  `gaba_excites` keeps densities and scales by size. P_max is set so each channel's GHK slope conductance at
  rest equals its gbar·Po∞, so the ohmic source and the GHK use agree where they overlap.
- The constant parts are calibrated so the totals at −80 mV are still the lecture's 1 : 0.02 : 0.5, so the
  resting cell and the GHK example stay as they are; away from rest the ratio moves.
- Vm is found as `gaba_excites` finds it: scan the steady-state I–V for its most hyperpolarized zero, then
  bisect, with a test that today's resting state is unchanged.
- Shown first in the GHK chapter as "What is the leak?": a steady-state I–V panel (its zero is rest, its slope
  1/Rin) with K2P, Na⁺ window and tonic GABA/glutamate controls; then an Rin readout in the running-cell
  chapters.

## Consequences

- Every pinned number in rundown, pumps and chloride will move when the running-cell chapters adopt it; the
  presets are re-solved and the tests re-pinned in the same change.
- The homeostat branch also changed `restingV`; whichever lands second rebases.
- Order (proposed): after the concentration view Tony is choosing.
