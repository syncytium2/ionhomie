# Tony's second look, v0.1.2, 2026-10-20

## Crossings looked like ping-pong (fixed, deployed in v0.1.3)

> *"another new feature looks crazy the channels and pumps pull ions from a great distance and then shoot
> some at the pump and transporters. looks like ping pong"*

Cause: a crossing took the nearest dot of that ion *anywhere* on its side and pulled it to the pore in half
a second whatever the distance, then flung it 34 px past the membrane. Fixed in `src/views/draw.ts`: only a
dot within ~80 px of the pore can cross; it walks over at ~30 px/s (a far dot takes seconds, not a jump);
it is let go just past the pore and wanders on. If no dot is close enough, the crossing waits (a backlog of
at most three); a pump or cotransporter cycle runs only when every ion it carries is at hand. Noted on
[ADR-0011](../adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md).

## Seeing the concentrations, realistically (decided 2026-10-21: all three, the learner picks; [ADR-0016](../adr/0016-the-learner-picks-how-the-stage-shows-concentrations.md))

> *"i think we need a way to visualize the concentrations inside and out, but keep a degree of realism. e.g.
> there are no calcium ions inside, despite the fact that intracellular free calcium is crucial for neuronal
> function. likely due to the massive gradient. similar for sodium and chloride, but at least you can see a
> few of those."*

The one-scale stage cannot show this by construction: with ~10¹⁰ ions per dot, inside Ca²⁺ (0.1 µM) is a
few thousandths of a dot, inside Na⁺ (10 mM) about 3 dots, inside Cl⁻ (5 mM) about 2. Options put to Tony are
in the session reply of 2026-10-20 and summarized in MILESTONES' open item.

### Draft figures for the three options (2026-10-20)

Static mockups, drawn with the app's colors and glyphs, every count from the model's concentrations
([`drafts/options.html`](drafts/options.html) draws them):

1. **Focus on one ion** ([png](drafts/option_1.png)): Na⁺ (inside 12 dots, outside 14.5× denser, still
   countable) beside Ca²⁺ (inside 12 dots at 0.1 µM, each ≈ 21,000 ions; outside 25,000× denser, a haze).
2. **A census of one cubic micrometer** ([png](drafts/option_2.png)): every free Ca²⁺ in 1 µm³ inside,
   drawn: 60. Outside, 1.5 million. Counts for every ion on a log scale.
3. **A magnifier on the membrane** ([png](drafts/option_3.png)): a 100 nm cube on each side at one dot per
   500 ions: inside, K⁺ 168, Na⁺ 12, Cl⁻ 6 and no free Ca²⁺ (0.06 on average); outside, 3 Ca²⁺.

*Correction to the magnifier draft: its outside label "3 Ca²⁺ in this cube" was wrong. The cube holds about
1,500 Ca²⁺ ions, drawn as 3 dots of 500; the built view says so.*
