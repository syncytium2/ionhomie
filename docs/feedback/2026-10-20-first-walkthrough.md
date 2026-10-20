# Tony's walkthrough of v0.1.1, 2026-10-20

**Status: built, 2026-10-20, not yet deployed.** Tony reviewed home, diffusion, drift, compartments and one
channel, then: *"i need to stop here, but you can extrapolate to the remaining tabs based on this feedback.
students are very visual and get thrown off by mismatches."* Where each item went:
[ADR-0011](../adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md) (scales, crossings, motion),
[ADR-0012](../adr/0012-a-nav-bar-on-every-page.md) (nav bar),
[ADR-0013](../adr/0013-a-balance-beside-the-ruler.md) (ruler and balance). The notes below are kept as written.

## Home page

Tony's words, from a screenshot of the home page's cell:

> *"I'd slow down the animation on the start page. the jitter is pretty annoying. i'd make the
> membrane proteins bigger. is it possible to model it such that you actually see a Cl- ion go in
> and out? the k and na leaks are just a blur. it looks like lots of ions flowing, but they don't
> match the perception of ions in the cells. 2 Na+ ions, but a torrent through the leak and pump."*

| item | note from the session (not a decision) |
|---|---|
| Slow the animation; less jitter | The particle jitter is cosmetic (`CellStage.step`, a fixed σ per frame), not the model, so it can be calmed without touching the physics. |
| Bigger membrane proteins | Channel, pump and transporter glyphs are drawn at a fixed ~26 px; they could scale with the cell. |
| **See a single Cl⁻ go in and out** | Possible, and honest: draw *unidirectional* fluxes, not net. The GHK flux splits exactly into an influx and an efflux term; at rest Cl⁻'s are equal, so a student would see Cl⁻ crossing both ways with nothing net, which is the point of passive distribution. K⁺ and Na⁺ would show their imbalance the same way. |
| **The torrent does not match the 2 Na⁺ inside** | Tokens today are on a square-root "relative rate" scale, unconnected to the particle scale: the inconsistency Tony saw is real. The fix is one scale for both: if each dot inside stands for about 10¹⁰ ions (the cell's K⁺ over its drawn K⁺ dots), the resting K⁺ leak, about 10⁸ ions per second here, is one dot crossing every ~100 s of cell time, so a few per second at 60× speed. Crossings would then be rare, countable, and consistent with the dots in the cell. ADR-0004's rule (particles depict the model) would then hold for fluxes too. |

## Navigation

> *"also need full nav bar at the top. maybe ionhomie and born on version info one line, the a row
> of concepts that persist through the entire site."*

| item | note |
|---|---|
| Two-line header: "ionhomie · born … · v…" on one line, then a persistent row of every chapter | Changes ADR-0008's "one row: back, title, forward" into a full nav. Still only title and nav above the action, so the rule holds; the ADR needs superseding. `scripts/check.mjs` already allows it. |

## The voltage ruler

> *"the voltage ruler is cool, but y-axis is sublte and the the zero line really needs a bit more
> drama. wonder if a teeter totter is better to show the balancing?"*

| item | note |
|---|---|
| A stronger y-axis | Larger tick labels, gridlines at each 20 mV, a heavier axis. |
| A dramatic zero line | A solid, labeled 0 mV line, perhaps with "inside positive" / "inside negative" shading above and below. |
| **A teeter-totter for the balance** | The ruler shows *where* Vm sits; a balance would show *why it holds still*. Two candidate uses: (1) in the drift and one-channel chapters, one ion's chemical push against its electrical push, level exactly at E; (2) in GHK, each ion's current as a weight on its side, the beam level when they sum to zero. It could sit beside the ruler rather than replace it. |

## Diffusion

> *"the slowed doesn't work on the jitter, just the diffusion. i assume these are two different
> sims in parallel?"*

| item | note |
|---|---|
| One simulation, not two | The speed setting sets Δt for the one random walk. Each frame every ion steps √(2D·Δt), so slowing the clock 4× slows the spreading 4× but shrinks each frame's step only 2×; and at 60 frames per second each frame is a fresh, independent kick, so the dots buzz however slow the clock. The perception is √t, the chapter's own lesson. |
| Proposed fix (held) | Sample the walk about 10× per real second and glide each dot between samples, like a lower camera frame rate: true samples, straight paths between, jitter and spreading slowing together. Optionally a readout tying it to √t ("4× slower clock → 2× smaller steps"), and a toggle to show every step. |

## Drift

> *"drift needs the slowing option."*

| item | note |
|---|---|
| A speed control, as on the diffusion page | Drift runs at one fixed rate today (`simPerReal = 0.0012`, slowed about 800×, in `src/chapters/Drift.tsx`). Give it the same speed select, and the same sampled-and-glided playback proposed for diffusion so slowing calms the jitter too. Slowed far enough, a student could watch a single ion being pushed by the field. |

## Compartments

> *"changing the charge doesn't appear to change the ion composition?. am i missing the point? i
> wonder if we need a way to show the charng on the membrane in the primary figure for clarity"*

| item | note |
|---|---|
| The composition does not change, and that is the lesson | Charging this cell to −80 mV moves ~6 million ions, ~1 in 61,000 of its K⁺: no dot or bar can show it. But only the ledger below says so; on the stage nothing happens, so the slider reads as broken. |
| Proposed (held): show the charge on the stage itself | (1) A charged rim: a thin layer of + on one membrane face and − on the other, density with \|Vm\|, swapping faces as Vm changes sign, labeled as magnified (~10⁵×); every bulk dot stays put. (2) A zoom callout from a patch of the stage's membrane to the ledger, so the ledger reads as a close-up of the main figure. The rim would carry into every later chapter, putting Vm on the cell, not only on the ruler. |

## One channel

> *"one channel creates a torrent way out of proportion to the number of ions we see"*

| item | note |
|---|---|
| The torrent is not honest | Charging to −85 mV moves ~6.6 million K⁺, ~1 in 53,000 of the cell's K⁺. At the bulk dot scale (~10¹⁰ ions per dot) that is under a thousandth of one dot: nothing should visibly enter the bath. The stream is a visual flux scale unconnected to the dots, the same defect as on the home page. |
| Proposed (held): crossings feed the charged rim | The K⁺ that cross do not join the bath's dots; they line up as the + layer on the membrane's outer face, at the rim's labeled magnification (~10⁵×, see Compartments), leaving the − layer inside. Opening the channel builds the rim while every bulk dot stays put; at E_K the net stream stops and a few ions flicker through both ways, equally. Two scales, each labeled and each consistent with the physics: dots for the bulk, rim and crossings for the membrane charge. The ledger's arithmetic becomes the caption. Resolves the home page's torrent the same way. |

## The remaining tabs, extrapolated (Claude, from the notes above)

The rule taken from the review: **nothing on the screen may contradict anything else on it.**

| tab | what that meant |
|---|---|
| Two ions and GHK | Rim-scale rings in both directions through each channel: K⁺ out faster than in, Na⁺ in faster than out, Cl⁻ (at its reversal potential in the lecture's example) equal both ways. The ± rim. A balance of outward against inward current, level with both pans loaded. |
| Rundown | Real dots cross at true one-way rates, so the Na⁺ dots that enter are the ones that pile up and the cell visibly fills and swells. The dead pump does not turn. |
| Pumps | The pump moves 3 Na⁺ out and 2 K⁺ in per cycle as one group; ouabain stops the rotor and the groups. Ca²⁺ is not drawn (0.1 µM is a few thousandths of a dot), and the note says so. |
| Chloride | NKCC1 moves 1 Na⁺, 1 K⁺, 2 Cl⁻ in together; KCC2 1 K⁺, 1 Cl⁻ out together. At 30 minutes per second the true rates are thinned to 1 in *k*, both ways alike, and the stage says so. |
| Every compartment stage | Both scales printed on the stage; bigger membrane proteins; calm motion. |
