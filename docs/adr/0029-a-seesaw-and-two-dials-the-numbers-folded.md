# ADR-0029: The reaction box shows a seesaw and two dials, its numbers folded; the whole cell regrouped

## Status

Accepted, 2026-11-10. Tony, on the reaction box's readouts: *"i don't understand the "so far" is that CO2 and HCO3-? i think
this would be better displayed as the teeter totter, or dials. expanding it reveals the table. CO2->HCO3- has a mM
concentration, is that meant to be total converted?"*; on the buffers step, *"we definitely need a speedometer. the numbers are
just a blur"*; on the whole cell, *"layout in full page is screwy. there's no clue in the phone mode about all the stuff at the
bottom"*. The forms are Claude's.

## Decision

- **A seesaw shows which way the reaction runs.** Its ends are the equation's two sides; it tips by log₁₀ of forward ÷ backward,
  which equals K·[CO₂]/([H⁺][HCO₃⁻]): level at equilibrium, about 7° per tenfold, to a hundredfold. The heavier side is the side
  converting faster.
- **Two dials (speedometers) show how fast each direction runs**, on a log scale from 10⁻⁶ to 10⁴ mM/s. At equilibrium both read
  high and equal: nothing changes, plenty happens. The enzyme turns both up alike. They replace the arrows.
- **The numbers move into a folded table, "The numbers"**, with the running totals labeled for what they are: every conversion
  counted since the learner's last change, so they climb far past what the box holds (with the enzyme, about 1,900 mM/s each way).
  The net is the row that says what moved.
- **The whole cell, regrouped:** beside the stage, the voltage ruler and the pH gauge; then the pHi trace and buffer ledger beside
  the concentrations; then the readouts across the page.
- **On a narrow screen, a "Further down ↓" strip** ends the stage's controls, naming each panel below and scrolling to it.
  Buttons, not links: the address belongs to the router.
