# Tony on NCX and the deploy, 2026-11-10

> *"deploy. yes to ncx. then we can review the rest"*

Before deploying, a frame clip of the chloride page found a pile-up that v0.1.6 didn't have: after the NKCC1
preset, Cl⁻ dots crowd both sides of the Cl⁻ leak and are still there 30 s later. Asked whether to deploy anyway,
fix it first, or fix it alongside NCX, Tony chose *"Fix and NCX together"*. (v0.1.7 had meanwhile been deployed
by another session on 2026-10-28, so the pile-up is live.)

| note | what changed |
|---|---|
| Yes to NCX | Built as [ADR-0021](../adr/0021-the-na-ca-exchanger-runs-on-the-na-gradient.md). After ouabain, NCX reverses and Ca²⁺ climbs to 2.6 µM in 30 minutes; before NCX, it fell to 0.07 µM. |
| The Cl⁻ pile-up | Partly fixed by merging [ADR-0020](../adr/0020-a-crossed-dot-wanders-off-before-it-crosses-again.md) (built 2026-10-28, never merged). Not fully fixed; see below. |

## The pile-up, measured

Cl⁻-colored pixels in a 25 px disk 45 px inside and outside the Cl⁻ leak, 20–40 s after the NKCC1 preset,
averaged over 20–40 frames. Same physics in every version, so the counts compare directly.

| version | inside | outside |
|---|---|---|
| v0.1.6 | 5–21 | 47–120 |
| v0.1.7 (live) | 33–136 | 74–186 |
| v0.1.7 + ADR-0020 | 89–106 | 120–159 |

The run-to-run spread is wide, but the order holds. The cause is a trade-off, not a single bug. The stage holds
too few dots near each pore to supply the crossings it asks for: about 6 per second per direction are requested,
and only 1–2 per second are drawn, at every reach tried. v0.1.6 met the demand by reusing the dot that had just
crossed (Tony: *"chloride ions never leave the chloride leak channel"*). Forbidding reuse (the 3 s rest, then
ADR-0020's wander-away rule) brings dots in from up to 80 px away, so several are walking toward the pore at once,
and they read as a crowd. Variants tried:

- **A 30 px reach** removes the crowd but draws a third or less of the crossings, and skews the in/out ratio.
- **A 40–60 px reach** roughly halves the crowd, and halves the crossings.
- **A lower cap on crossings shown** does little by itself.

None was kept. The remaining fix is a design question for Tony: more dots near the pores (denser bulk dots
on the scarce side), a slower shown rate with a larger stated "1 in k", or tolerating some reuse.
