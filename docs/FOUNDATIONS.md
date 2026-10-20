# Foundations

> **Canonical source of truth for this project.** Read at session start, with
> [`GLOSSARY.md`](GLOSSARY.md). If anything in a conversation contradicts this file, this file
> wins until it is deliberately changed through an ADR ([`adr/`](adr/README.md)).

> **ionhomie** ([ADR-0007](adr/0007-the-name-is-ionhomie.md)): `syncytium2/ionhomie`, a React app in `src/`
> ([ADR-0010](adr/0010-the-app-is-react-on-the-ported-core.md)), with the proof-of-principle pages kept in `prototype/`.

## What the project is

A browser-based, heavily visual teaching instrument for **ion homeostasis**: how a cell comes
to have, and keeps, the concentration gradients and membrane potential it has. It is built
for graduate and medical students
([ADR-0002](adr/0002-the-learners-are-graduate-and-medical-students.md)) and is a sibling of
`gaba_excites` and `colonel_kernel`: client-side, no account, nothing leaves the machine, and
every number it quotes is pinned by a test against its source. It is used beside the Physiol 578 lectures, so
its concentrations, resting permeability ratio, notation and ion colors are the lectures'
([ADR-0009](adr/0009-numbers-and-colors-follow-the-578-lectures.md)).

**Every page leads with the action** ([ADR-0008](adr/0008-lead-with-the-action.md)): the title row (with the
born-on date, version and its date beside the title), then the visual, then controls, then all text.

## The one rule

**The physics computes; the particles only depict it**
([ADR-0004](adr/0004-the-physics-computes-the-particles-depict.md), proposed). Colored ions on
screen are a picture of a compartment model's state. The charge that sets Vm is about one ion
in 45,000 in a 10 µm cell, so it is shown on its own scale in the charge ledger, never read off
the particle crowd. The diffusion chapter is the exception: there the random walk is the model.

## The spine: one idea per chapter, each kept in the next

The order is fixed by the chapter-arc decision
([ADR-0001](adr/0001-the-arc-runs-ghk-then-rundown-then-pumps.md)). Each chapter adds one
mechanism and keeps every earlier one switched on. Each asks the learner to predict, beneath
the visual, before running it again.

| chapter | the idea | what the learner sees |
|---|---|---|
| **Diffusion** | Fick's law, J = −D·dC/dx; spreading time grows with distance squared | particles random-walking; the concentration profile flattening beneath them; flux arrows |
| **Drift** | a field moves charged ions and ignores neutral ones; z matters (Ca²⁺ drifts twice as hard). Against a concentration gradient, net flux reaches zero: **the Nernst equation, derived** | neutral and charged particles in one box with an applied field |
| **Compartments** | a membrane separates two volumes; it is a capacitor; impermeant anions (A⁻) inside keep the bulk electroneutral | the cell slice appears; concentration gauges per ion, inside and outside |
| **One channel** | open a selective channel and Vm runs to that ion's Nernst potential, while the bulk concentrations barely change | the voltage ruler appears; the charge ledger fills; the Vm trace |
| **Two ions and GHK** | with two permeable ions Vm sits between their equilibrium potentials, weighted by permeability. This is a steady state, not an equilibrium: both fluxes continue | the Vm needle between two ticks on the ruler; a permeability-ratio slider |
| **Rundown** | with no pump, the steady state is not steady: gradients decay, Vm drifts toward zero, A⁻ drive Donnan swelling | the clock sped up; gauges converging; the cell outline growing. Clinical cases: ischemia, digoxin/ouabain, hyperkalemia |
| **Pumps** | the Na⁺/K⁺-ATPase (3 Na⁺ out, 2 K⁺ in, one ATP) holds the gradients and the volume: the pump–leak steady state. Then calcium pumping | the pump's turnover and ATP meter; ouabain bringing the rundown back |
| **Chloride** | with no transporter, Cl⁻ is passively distributed (E_Cl = Vm). NKCC1 loads it and KCC2 extrudes it, both running on the gradients the pump built; E_Cl sets E_GABA | the Cl⁻ tick sliding on the ruler; KCC2 pushing it toward E_K, NKCC1 lifting it to a GnRH neuron's −36.5 mV (DeFazio et al. 2002) |
| **Sandbox** | everything unlocked | every control at once |

## The views every chapter shares

- **The stage**: a 2D slice of the cell, or a box with a membrane across it
  ([ADR-0005](adr/0005-two-dimensions-first.md)), with colored ions.
- **The voltage ruler**, from the one-channel chapter on: a vertical mV scale with a colored tick
  at each ion's equilibrium potential, a needle at Vm, and an arrow from the needle to each tick
  for that ion's driving force, its thickness set by conductance. Every later idea reads off it.
- **Concentration gauges**: one bar per ion, inside against outside.
- **The charge ledger**: a magnified inset at the membrane showing the excess charge, on its own
  scale, beside the change in bulk concentration.
- **Flux arrows** on every channel, pump and transporter, sized by rate.
- **The clock**, with its speed-up always on screen.

## What must not be inferred

Each of these is a misreading the tool must actively prevent, not merely avoid causing.

- **That changing Vm takes a large movement of ions.** The charge ledger exists to refute it.
- **That the drawn particles are the real numbers.** They are a view; the gauges and the ledger
  carry the numbers.
- **That the resting potential is an equilibrium.** It is a steady state with continuing fluxes,
  which is why the cell needs a pump.
- **That the Na⁺/K⁺-ATPase generates the resting potential.** Its direct electrogenic share is a
  few mV; its job is the gradients and the volume.
- **That every ion has its own pump.** Cl⁻ gradients come from cotransporters running on the Na⁺
  and K⁺ gradients, or from nothing at all (passive distribution).
- **That the bulk solutions carry net charge.** They are electroneutral; the excess charge sits at
  the membrane.
- **That a sped-up clock shows real time.** Its factor is always displayed.

## What is not the goal

- **Not a research instrument.** Unlike `colonel_kernel`'s kernel recovery, nothing here is
  loaded from a lab; the models are teaching models with cited parameters.
- **Not a neuron simulator.** Action potentials appear only as a hint (swapping the Na⁺:K⁺
  permeability ratio); spiking belongs to `gaba_excites`.
- **Not 3D**, for now ([ADR-0005](adr/0005-two-dimensions-first.md)).
- **Not an undergraduate course**, for now
  ([ADR-0002](adr/0002-the-learners-are-graduate-and-medical-students.md)).

## The privacy promise

Everything runs in the browser. The site makes no third-party requests: no CDNs, fonts or
analytics ([ADR-0003](adr/0003-react-like-gaba-excites.md)).
