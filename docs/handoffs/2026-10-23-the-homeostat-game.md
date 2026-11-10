# Handoff 2026-10-23: the homeostat game

From the session that designed and built the game's first level ("you are the pump"). It sent this to another
session as a message when it ended at Tony's request, and that session saved it here on 2026-11-10 so the rules
below aren't lost. Read it with [`MILESTONES.md`](../MILESTONES.md),
[ADR-0014](../adr/0014-the-homeostat-is-a-game-beside-the-chapters.md) and
[the 2026-10-22 feedback](../feedback/2026-10-22-homeostat.md).

## State then (main at 444ef8b)

- Live was v0.1.6, with the first level (tap or drag Na⁺ out and K⁺ in against the leaks), the 100× clock, dials
  under the cell, and the collapse scene. The ADR-0018/0019 round has since deployed as v0.1.7.
- No branches or worktrees were left over.

## Open, waiting on Tony

- **The game's MILESTONES row** (now rewritten). The game runs at 100× with an hour's hold; NA_MAX 30, K_MIN 110
  and handTau 20 are unchanged. The open questions: at 100×, is 20 s of delivery right (each dot's Vm kick passes
  in about 0.2 real seconds)? Are the dots big enough to tap on a phone?
- **The pump level, not built** (designed in ADR-0014):
  - The goal is to hold the gradients and volume under an ATP budget, against perturbations: the leak doubled,
    bath K⁺ raised, partial ouabain.
  - The controls are the pump's capacity and its affinities. Label them "the pump's affinity": kNa and kK are
    recalled, not sourced.
  - Keep the 3:2 stoichiometry fixed, or offer 1:1 only to show the electrogenic share vanishing.
  - Include one unwinnable puzzle: "reach −95 mV with only the pump". It gains about 2.6 mV.
  - Never make Vm the goal. FOUNDATIONS forbids "the pump makes the resting potential".
- **The chloride level, not built:**
  - It opens with no transporters, so Cl⁻ can't be moved. Then NKCC1 and KCC2 unlock (`CCC_PRESETS`).
  - Targets: GnRH −36.5 mV (measured) and −85 mV (illustrative). Show both mM and E_GABA.
  - Show NKCC1 pulling Vm from −80 to −60 mV, and charge its extra Na⁺ to the pump level's ATP budget.
  - It needs hours of cell time, so a large, stated speed-up.
- **Since then:** NCX is built ([ADR-0021](../adr/0021-the-na-ca-exchanger-runs-on-the-na-gradient.md)), which
  bears on how the pump level's ouabain perturbation should look.

## Invariants to keep

- `extra` in `physics.ts` (the hand's flux) stays inside the zero-current solve.
- The tests "A hand that moves 3 Na⁺ out for 2 K⁺ in…is the pump" and "Stacked hand carries past ±200 mV…" must
  keep passing, including through any I–V scan that replaces `restingV`. Na⁺-out stacks put the zero below
  −200 mV; K⁺-in saturates near +54 mV.
- The game holds `viewPref.view = "cell"` while it is open, without persisting it, and restores the learner's
  choice on leaving ([ADR-0016](../adr/0016-the-learner-picks-how-the-stage-shows-concentrations.md)).
- A tap's reach is 16 px for touch and 12 px for a mouse. A wider reach grabbed neighboring K⁺ when a Na⁺ was
  already in flight.
