# ADR-0021: The Na⁺/Ca²⁺ exchanger runs on the Na⁺ gradient, and reverses when it fails

## Status

Accepted in part, 2026-11-10. Tony decided to add NCX (*"yes to ncx"*). The rate law, the 50% share and the
drawing are Claude's choices; Tony hasn't ruled on them.

## Context

Tony, on the pumps page (2026-10-22): *"even though the cell hits 0mV the pmca is still happily functioning,
maintaining a powerful calcium gradient"*. That was correct for the model: ouabain leaves ATP, so the PMCA keeps
pumping. But the model had no other Ca²⁺ route, so after ouabain Ca²⁺ actually *fell*, from 0.10 to 0.07 µM in
30 minutes. A cell has the Na⁺/Ca²⁺ exchanger. It runs on the Na⁺ gradient the pump builds, and it reverses as
that gradient fails, which is how cardiac glycosides raise cell Ca²⁺. Without it, the app misses one of its own
lessons: "not every ion has its own pump" (FOUNDATIONS) applies to Ca²⁺ as well as Cl⁻.

## Decision

- **Stoichiometry and rate law.** 3 Na⁺ for 1 Ca²⁺, one net charge per cycle. It is a linear teaching model:
  current = g·area·(Vm − E_NCX), with E_NCX = 3·E_Na − 2·E_Ca, outward positive. Forward mode (Ca²⁺ out, 3 Na⁺
  in) is an inward current. It reverses exactly where Vm crosses E_NCX, as thermodynamics requires. It uses no
  ATP.
- **It is part of the zero-current solve.** The current is linear and increasing in Vm, so the solve stays
  monotone, and the homeostat's invariants (the hand is the pump; stacked carries past ±200 mV) still hold.
- **The healthy cell is still solved exactly, not tuned.** NCX carries `NCX_SHARE` (0.5) of the resting Ca²⁺
  extrusion and the PMCA the rest. The pump's rate is solved to return NCX's Na⁺ as well as the leak's. The
  0.5 is illustrative, not measured. At 0.1 µM the high-affinity PMCA does most of the work in many cells, and
  NCX dominates in heart muscle. The share was chosen so the reversal shows clearly: at 0.3, Ca²⁺ reaches only
  0.37 µM after 30 minutes of ouabain; at 0.5, it reaches 2.6 µM.
- **Where it shows.** On the pumps page (the chapters that draw Ca²⁺), NCX is a gray transporter with no ATP site,
  like the cotransporters (ADR-0018). Its binding rings show 3 Na⁺ and 1 Ca²⁺. Like the PMCA, it rocks at its
  rate, because Ca²⁺ at 0.1 µM is too dilute to draw as dots. Its label says which way it runs ("NCX: Ca²⁺ out",
  "NCX reversed: Ca²⁺ in"), and readouts give the mode and E_NCX against Vm. A button stops it, so the learner
  can see Ca²⁺ stay low after ouabain without it.
- **Rundown and the homeostat** keep NCX running, since it needs no ATP. Its Na⁺ flux is about 10⁴ times smaller
  than the leaks', so their numbers do not change. Those pages don't show Ca²⁺.

## Consequences

- Every earlier pinned number is unchanged: Vm −80.3 mV, pump current 11.08 pA, the 2.6 mV electrogenic share,
  and the 30-minute rundown (Na⁺ 114 mM, K⁺ 36 mM, Vm −45 mV, 1.09× volume).
- New pins in `src/core/physics.test.ts`: E_NCX −56.24 mV at rest, with NCX forward; after 30 minutes of
  ouabain, NCX has reversed and Ca²⁺ is 2.6 µM; with NCX stopped, Ca²⁺ falls instead.
- There is still no Ca²⁺ buffering, so Ca²⁺ moves far faster here than in a real cell. The pumps page says so.
- The proton work (ADR-0022 onward, a later session) will rebase onto this before it changes `Ion` and
  `healthyState`.
- To check against a source: the share, and a published NCX model (for example DiFrancesco & Noble 1985, or
  Luo & Rudy 1994) for the shape of its I–V curve, which the linear form only approximates.
