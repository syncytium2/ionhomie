# ADR-0027: The protons page steps through its players

## Status

Accepted in part, 2026-11-10. Tony: *"right now the protons page is way to busy as a teaching slide. i think need a step
trhough mode so we can introduce each element of acid homeostasis, the players and their functions"*, and he proposed an
order. Asked four questions (when the pump arrives, whether buffering gets a step, a membrane box or the whole cell for the
middle steps, and the page's default), he answered: *"1, yes i forgot the n in nhe. 2. own step. 3. lets try whole cell.
4. step through with a toggle to get to the action quickly if needed"*. The forms are Claude's; the first two steps are
mocked up for his review ([`docs/feedback/drafts/protons-steps/`](../feedback/drafts/protons-steps/steps.html)).

## Decision

- **The page opens in step-through mode**, with a toggle that skips straight to the whole cell with everything on.
- **The steps, each adding one player and keeping the earlier ones:**
  1. the reaction, CO₂ + H₂O ⇌ H⁺ + HCO₃⁻, in a sealed box of solution, no cell;
  2. buffers, and carbonic anhydrase;
  3. the cell, with the Na⁺/K⁺ pump and NHE1 (the pump arrives with the first player that runs on its gradient);
  4. NBC;
  5. the proton leak, and Vm;
  6. the whole cell, as the page is today.
- **The middle steps use the whole cell**, showing only the players introduced so far.
- **Carbonic anhydrase arrives with the buffers, not with the bare reaction.** In plain solution, adding CO₂ converts only
  about 30 nM: the H⁺ has nowhere to go, so equilibrium comes in well under a millisecond, enzyme or not. With a buffer,
  0.75 mM converts, taking about 6 s without the enzyme and no time with it. The enzyme speeds both directions alike, so it
  sets only how fast; the direction and the endpoint come from the concentrations.

## Open

- The reaction box's rate constants are placeholders until sourced: uncatalyzed hydration 0.13 s⁻¹ at 37 °C, and the
  buffer at 25 mM with pK 6.9.
- Tony's review of the first two steps' mockup comes before the build.
