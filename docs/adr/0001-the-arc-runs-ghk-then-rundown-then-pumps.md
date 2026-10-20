# ADR-0001: The arc runs GHK, then rundown, then pumps

## Status

Accepted, 2026-10-19, by Tony, on trial: "let's try it your way." The ordering was Claude's
recommendation; Tony's original brief put the pumps before GHK. Revisit once the GHK, rundown
and pump chapters exist and can be played through in order.

## Context

Tony's brief, in order: Fick's law and diffusion; the electrical gradient for charged ions;
compartments (inside versus outside a cell); a selective channel to open and close, watching
the ions flow and Vm change; the Nernst potential; the Na⁺/K⁺-ATPase and calcium pump
establishing the fundamental gradients; cotransporters establishing the chloride gradient;
the GHK equation.

Two arcs fit those pieces after the single-channel Nernst chapter:

- **Constructive** (the brief's order): the pumps build gradients from equal concentrations,
  cotransporters build the chloride gradient, and GHK comes last as the synthesis. Closest to
  the textbook sequence.
- **Problem, then solution**: a second permeable ion brings in GHK; the gradients run down
  without a pump; the pump arrives as the fix.

Under the constructive order, the pump chapters already run Na⁺ and K⁺ leaks, so the learner
watches a Vm that sits at no ion's equilibrium potential and has no tool to explain it until
the last chapter. And the pump builds gradients from equal concentrations, a state no cell is
ever in, before the learner knows why gradients matter.

## Decision

The chapters run in this order:

1. **Diffusion**: Fick's law, by a true random walk.
2. **Drift**: charged ions in an applied field. Combined with a concentration gradient, the
   net flux reaches zero, and that balance *is* the Nernst equation, derived here.
3. **Compartments**: a membrane, inside and outside volumes, the membrane as a capacitor, and
   impermeant intracellular anions (A⁻).
4. **One channel**: a selective channel to open and close; Vm runs to that ion's Nernst
   potential while the bulk concentrations barely change.
5. **Two permeable ions and GHK**: Vm settles between the ions' equilibrium potentials,
   weighted by permeability. A steady state, not an equilibrium: the fluxes are nonzero.
6. **Rundown**: with no pump, the gradients decay, Vm drifts toward zero, and the trapped A⁻
   drive Donnan accumulation and swelling.
7. **Pumps**: the Na⁺/K⁺-ATPase as the fix (the pump–leak steady state), then calcium
   pumping. Its direct electrogenic share of Vm is stated: a few mV.
8. **Chloride**: first passively distributed (E_Cl = Vm), then set by NKCC1 and KCC2 running on
   the gradients the pump built, ending at E_GABA.
9. **Sandbox**: everything unlocked.

## Consequences

- GHK is introduced in the two-permeable-ions chapter and used in every chapter after it, not
  saved for the end.
- The rundown chapter carries the clinical cases a medical audience needs (ischemia,
  digoxin/ouabain, hyperkalemia); see the learners ([ADR-0002](0002-the-learners-are-graduate-and-medical-students.md)).
- The pump chapter has to say plainly that the pump's job is holding gradients and volume,
  not generating Vm. FOUNDATIONS lists the contrary reading as one that must not be inferred.
- NCX belongs in the chloride-and-transporters chapter, with the other secondary transport,
  not with the pumps.
- If the trial goes against this arc, a superseding ADR restores the constructive order; the
  chapters themselves are the same pieces, so little is lost.
