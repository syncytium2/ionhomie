# ADR-0009: The numbers and the ion colors follow the Physiol 578 lectures

## Status

Accepted, 2026-10-20. Tony asked: "check the 578 folder in dropbox for my powerpoint lecture
slides." Aligning the app's numbers and colors with them is Claude's reading of why; Tony has
not ruled on the details below.

## Context

The app will be used beside the 578 lectures. A subagent read the decks on diffusion, ion
homeostasis, Ohm/Nernst/GHK (2024), chloride homeostasis (2019) and calcium homeostasis, and the
2026 homeostasis deck. Where the app's numbers or colors differed from the slides, students
would meet two answers to one question.

## Decision

- **Concentrations**: the lecture's neuronal table (ohm/Nernst/GHK deck, slide 8). Inside Na⁺ 10,
  K⁺ 140, Ca²⁺ 0.0001 mM; outside Na⁺ 145, K⁺ 5, Cl⁻ 106, Ca²⁺ 2.5 mM. The pump–leak cell is solved
  to hold the inside values exactly; inside Cl⁻ is left passive and comes out at 5.2 mM (the
  chloride deck's cortical pyramidal neurons: about 5.3 mM; the table: 6 mM).
- **Resting permeability**: the lecture's "typical resting cell", pK : pNa : pCl = 1 : 0.02 : 0.5
  (slide 13). The GHK chapter reproduces its −76.8 mV example exactly; a test pins it.
- **Notation**: E_rev = (RT/zF) ln([S]out/[S]in) with ln and 26.7 mV at 37 °C, lowercase p for
  relative permeability, "driving force" as Vm − E, Vm (never Em).
- **Colors**: the lectures' scheme, adapted to the dark format Tony kept. K⁺ blue, Cl⁻ red(-orange),
  Ca²⁺ green as in the decks; Na⁺, black on the slides, is white here. The hues lean toward
  Okabe–Ito so they stay apart under color-vision deficiency. Glyph shape still carries charge.
- **The squid preset stays, labeled historical**, so it is not confused with the lecture's ratio.

## Consequences

- Every pinned number moved: the healthy cell now rests at −80.3 mV (the pump's own current is
  2.6 mV of it), and the cotransporter presets were re-solved. `src/core/physics.test.ts` holds
  the new values.
- With pCl at half of pK, Cl⁻ is a large part of the resting conductance, so loading Cl⁻ with
  NKCC1 drags Vm (from −80 to −60 mV). The chloride chapter says so instead of claiming Vm stays put.
- Passive Cl⁻ already sits at −80.3 mV, so KCC2 can only lower it; the KCC2 preset now aims at an
  illustrative −85 mV rather than the measured cortical −79 mV, which this cell cannot reach.
- This supersedes the color table in GLOSSARY that the prototype used.
