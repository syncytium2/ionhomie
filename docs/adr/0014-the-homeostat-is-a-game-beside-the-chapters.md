# ADR-0014: The homeostat is a game beside the chapters, and a hand's carry goes through the physics

## Status

Proposed, 2026-10-20, by Claude. Tony asked for it: *"add a tab to gamify ion homeostasis. make the human
manually keep ions in balance. level one is literal click and drag ions against their gradients and leak.
level two requires understanding of the na k atpase, adjust functional parameters to achieve a stable
membrane potential. level 3 adds chloride transporters. adjust function to achieve a chloride
concentration."* The design below is Claude's, revised after review by the ionhomie session. Only the
first level is built.

## Context

The chapters teach pump–leak homeostasis by watching it. A game makes the learner do the pump's work, and
so feel its rate, its stoichiometry and its cost. Two things in the brief needed care:

- **A dragged ion is a lot of charge.** One dot is billions of ions (ADR-0011); the charge on the membrane
  at −80 mV is about 6 × 10⁶. Moving a dot's worth of Na⁺ as a jump in the amounts would leave the inside
  hundreds of times more charged than the membrane can hold, and the quasi-steady Vm would never show it.
- **"A stable membrane potential" as the pump level's goal would teach a forbidden misreading** (FOUNDATIONS:
  the Na⁺/K⁺-ATPase does not generate the resting potential), and is nearly free anyway: the pump speeds up
  with internal Na⁺, so almost any capacity above a threshold settles.

## Decision

- **A separate route, `#/homeostat`, outside the reading order** (ADR-0001 fixes the chapters). Its nav tab,
  "▶ Homeostat", sits after Chloride, set apart; the home page lists it after the chapters.
- **The first level: you are the pump.** The rundown chapter's cell (leaks on; pump and PMCA stopped). A tap on
  a Na⁺ or K⁺ dot sends it straight across the membrane (inside to out, outside to in), which works on a
  phone; a drag carries it wherever it is let go. Tony: *"consider just a simple click to remove an ion from
  inside to outside. this might make it work on the phone too"*, said of the drag-only version. A tap
  reaches only a dot under the finger (16 px), so a tap on a dot already crossing does nothing. Win by holding Na⁺ inside
  under 30 mM and K⁺ over 110 mM for 10 minutes of cell time; lose when either is crossed. The limits are the
  game's, and the page says so. The clock runs 2, 5 or 10 seconds per second, stated on screen; at 5, a
  steady player drags about once every few seconds.
- **A carry is a crossing of one real dot, at the stage's own scale** (ADR-0011), not a separate game scale.
- **A carry goes through the physics as a flux.** `physics.ts` takes an optional extra flux per ion
  (`Extra`, mol/s, outward positive) in `netCurrent`, `restingV`, `snapshot` and `step`, inside the
  zero-current solve. The lab delivers each carried dot's moles as a flux that dies away over 20 seconds of
  cell time. So an unbalanced carry moves Vm and the leaks pay the charge back, as for the pump; a hand
  moving 3 Na⁺ out for 2 K⁺ in at the pump's rate is exactly the pump (pinned in `physics.test.ts`).
- **The readouts teach the bridge to the next level**: the player's Na⁺ out : K⁺ in against the pump's
  1.5 : 1, the hand's current and its share of Vm now, and at the end, the ATP a pump would have split
  against the pump cycles the player's carrying was worth.
- **The later levels, as planned, not built**:
  - *The pump*: hold the gradients and volume under an ATP budget against perturbations (the leak doubled,
    bath K⁺ raised, partial ouabain), with the pump's capacity and affinities as controls (labeled as the
    pump's affinity, since the constants are recalled, not sourced). One puzzle cannot be won: "reach
    −95 mV with only the pump"; turning it all the way up gains a few mV.
  - *Chloride*: with no transporters, Cl⁻ cannot be moved; then NKCC1 and KCC2 unlock, aiming at the GnRH
    neuron's E_Cl of −36.5 mV or a mature neuron's −85 mV, shown in mM and as E_GABA, with the Vm shift
    NKCC1 brings made visible and the extra Na⁺ it loads charged to the pump's budget. Hours of cell time:
    a large, stated speed-up.

## Consequences

- One dot is about 3.5 mM here, so each carry kicks Vm visibly (up to about 20 mV while it is delivered),
  far more than the real pump's smooth 2.6 mV share. That is the true effect of so lumpy a hand, but the
  20-second delivery time is a choice and may want lengthening if the kicks distract.
- `CellStage` gained `grab`, `carry` and `drop`, and draws a held dot; `Lab` gained the hand (`give`,
  `extra`). Both are additive.
