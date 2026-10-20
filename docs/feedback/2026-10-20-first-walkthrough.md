# Tony's walkthrough of v0.1.1, 2026-10-20

**Status: on hold.** Tony: *"hold on these until i comment on each lesson."* Nothing below is
built yet. Notes are added here as each lesson is reviewed; when work starts, each item becomes
an ADR or a MILESTONES row and is marked here with where it went.

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
