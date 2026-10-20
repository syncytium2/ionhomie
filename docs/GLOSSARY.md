# Glossary

> **Read at session start**, with [`FOUNDATIONS.md`](FOUNDATIONS.md). This file owns what each
> word means, each ion's color and glyph, and how figures label things; FOUNDATIONS owns how the
> ideas relate. A term means exactly one thing here, and the code, figures and pages use it
> that way.

## The ions: color and glyph

The Physiol 578 lectures' scheme, adapted to the dark format
([ADR-0009](adr/0009-numbers-and-colors-follow-the-578-lectures.md); Tony has not ruled on the exact hues).
Color never carries the meaning alone: the glyph carries the charge. `src/styles.css` holds the values.

| ion | color | glyph |
|---|---|---|
| **Na⁺** | white, `#ececec` (black on the slides) | circle marked + |
| **K⁺** | blue, `#56b4e9` | circle marked + |
| **Ca²⁺** | green, `#2fbf71` | circle with a double ring |
| **Cl⁻** | red-orange, `#e8743b` | diamond marked − |
| **A⁻** | brown-gray, `#8a7f6a` | large rounded shape (an impermeant intracellular anion, standing for proteins and other trapped anions) |
| **Vm** | yellow, `#f0e442` | the ruler's needle and every Vm trace |
| links | lavender, `#b4b9ff` | a hue no ion uses |

## The cell

| term | means |
|---|---|
| **compartment** | a well-mixed volume with its own concentrations: inside, outside, and later perhaps the ER |
| **membrane** | the boundary between compartments; a capacitor, crossed only through pathways |
| **pathway** | anything an ion crosses the membrane by: a channel, a pump or a transporter |
| **Vm** | membrane potential, inside relative to outside, in mV |
| **electroneutrality** | each bulk compartment's net charge is zero; the excess charge that sets Vm sits at the membrane |
| **impermeant anion**, **A⁻** | charged solute trapped inside the cell; the source of Donnan effects |

## The physics

| term | means |
|---|---|
| **diffusion** | net movement down a concentration gradient by random walk; Fick's law, J = −D·dC/dx |
| **drift** | net movement of a charged ion in an electric field |
| **reversal potential**, **equilibrium potential**, **E_ion** (E_K, E_Na, E_Cl, E_Ca; the lectures' E_rev, E_S) | the Vm at which one ion's net flux is zero; given by the Nernst equation, written E_rev = (RT/zF) ln([S]out/[S]in) = (26.7 mV/z) ln(…) at 37 °C |
| **driving force** | Vm − E_ion, in mV; its sign says which way the ion's current flows. The lectures put it in quotes |
| **permeability**, **P**; **relative permeability**, **p** (pK, pNa, pCl) | how readily a pathway passes an ion, in the GHK sense (cm/s); lowercase p is relative to pK, as in the lectures |
| **conductance**, **g** | how readily a pathway passes current at a given Vm (nS); related to, not the same as, permeability |
| **equilibrium** | every net flux is zero, with no energy spent |
| **steady state** | nothing changes over time, but fluxes continue and something pays for them |
| **GHK equation** | the Goldman–Hodgkin–Katz voltage equation: the Vm at which the net current of several permeable ions is zero. Its **flux equation** gives each ion's flux at any Vm |
| **rundown** | the decay of gradients when nothing pumps |
| **pump–leak** | the steady state in which pumps exactly replace what leaks |
| **Donnan equilibrium** | the distribution permeable ions reach around trapped charge; with no pump it draws water in and the cell swells |
| **electrogenic** | moving net charge per cycle (the Na⁺/K⁺-ATPase: one net + out); **electroneutral** moves none (NKCC1, KCC2) |

## The views

| term | means |
|---|---|
| **the stage** | the 2D slice or box where the ions are drawn |
| **the voltage ruler** | the vertical mV scale with a tick at each E_ion and a needle at Vm |
| **the charge ledger** | the magnified inset showing the excess charge at the membrane, on its own scale |
| **gauges** | the per-ion bars of inside and outside concentration |
| **the clock** | simulated time; its **speed-up** is the factor by which it outruns real time, always shown |

## Units on figures

mM for concentration, mV for potential, µm for distance, pF for capacitance, nS for
conductance, °C for temperature. Time is given in the unit that suits the chapter (µs, ms, s,
min) and labeled every time.
