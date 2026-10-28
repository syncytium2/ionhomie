# Milestones: what has been established, and how strongly

**This answers "where are we?".** [`FOUNDATIONS.md`](FOUNDATIONS.md) is canonical truth and
[`adr/`](adr/README.md) holds the decisions.

⚠ **This file is a pointer, never an authority.** Where a row cites an ADR or a file, that
document owns the claim. Every row is pinned to a commit, so a row can go out of date but
cannot silently change its mind. The form is `bugarach`'s and `ml2dl`'s.

| strength | means |
|---|---|
| `built` | the capability exists and is tested |
| `measured` | a number produced by running something, reproducible from the cited file |
| `decided` | a human made the call, and an ADR records it |

**How to add to it.** A row lands in the same change as the work it describes.

## Established

| claim | strength | source | commit |
|---|---|---|---|
| The chapter arc runs GHK, then rundown, then pumps (on trial) | `decided` | [ADR-0001](adr/0001-the-arc-runs-ghk-then-rundown-then-pumps.md) | `98282a8` |
| The learners are graduate and medical students | `decided` | [ADR-0002](adr/0002-the-learners-are-graduate-and-medical-students.md) | `98282a8` |
| React, like gaba_excites | `decided` | [ADR-0003](adr/0003-react-like-gaba-excites.md) | `98282a8` |
| Two dimensions first | `decided` | [ADR-0005](adr/0005-two-dimensions-first.md) | `98282a8` |
| The name is ionhomie; public repo syncytium2/ionhomie | `decided` | [ADR-0007](adr/0007-the-name-is-ionhomie.md) | `98282a8` |
| Every page leads with the action; born-on, version and date beside the title | `decided` | [ADR-0008](adr/0008-lead-with-the-action.md) | `98282a8` |
| Numbers, notation and ion colors follow the 578 lectures | `decided` | [ADR-0009](adr/0009-numbers-and-colors-follow-the-578-lectures.md) | `98282a8` |
| The app: eight chapters and a home page, one hash route each, the action first on every one | `built` | `src/`; `npm run check` passes at 1280 and 390 px | `98282a8` |
| The proof-of-principle pages, kept | `built` | `prototype/`; its own checks still pass | `98282a8` |
| The lecture's GHK example (1 : 0.02 : 0.5, its concentrations) gives −76.8 mV | `measured` | `src/core/physics.test.ts` | `98282a8` |
| The healthy cell is an exact pump–leak steady state at the lecture's Na⁺ 10, K⁺ 140 mM, Ca²⁺ 0.1 µM: Vm −80.3 mV, passive Cl⁻ 5.2 mM, pump current 11.1 pA | `measured` | `src/core/physics.test.ts` | `98282a8` |
| Blocking the pump moves Vm at once by 2.6 mV (to −77.8 mV): its direct electrogenic share in this cell | `measured` | `src/core/physics.test.ts` | `98282a8` |
| With no pump, after 30 minutes: Na⁺ 114 mM, K⁺ 36 mM, Vm −45 mV, volume 1.09× | `measured` | `src/core/physics.test.ts` | `98282a8` |
| Crossed dots wander off before crossing again, scarce dots set the thinning, every stage wanders at 26 px/√s: ions no longer shuttle at the pores (Tony: "trapped moving in and out of the channel"); not deployed | `built` | [ADR-0020](adr/0020-a-crossed-dot-wanders-off-before-it-crosses-again.md) | see git log |
| Deployed v0.1.7: the pump-and-transporter round (the pump carries its ATP, ADR-0018; ATP as a star in a star-shaped site, ADR-0019) and a blocked pump halts mid-cycle; ions bind only when near (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | `7b29036` |
| Deployed v0.1.6: the homeostat round (100× clock, dials, the collapse scene, unclumped crossings) and the rocking transport proteins (ADR-0017) (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.5: the stage views (ADR-0016) and the homeostat's first level (ADR-0014) (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.4: the return link to tonydefazio.com and smaller ion dots (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.3, the ping-pong fix (Tony: "deploy the ping pong fix now") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.2, the review round, to https://ionhomie.tonydefazio.com (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.1 to https://ionhomie.tonydefazio.com and https://ionhomie.tonydefazio.workers.dev (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | `c7c4555` |
| Tony's review round built: two stated scales, one-way crossings, the charged rim, the nav bar, the balance, sampled playback | `built` | [ADR-0011](adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md), [0012](adr/0012-a-nav-bar-on-every-page.md), [0013](adr/0013-a-balance-beside-the-ruler.md); `npm run check` | `62da620` |
| Every cell stage has a View: cell, one ion, census of 1 µm³, magnifier; the learner's choice, kept in the browser | `built` | [ADR-0016](adr/0016-the-learner-picks-how-the-stage-shows-concentrations.md); `npm run check` drives every view | `fb444ba` |
| The tonydefazio.com tile is the home stage, drawn by `node scripts/tile-svg.ts` from the stage's own constants; live there as site 1.11.1 from 5c225e6. **It is a copy**: a change to `scripts/tile-svg.ts` or `src/views/stage-style.ts` that alters its look must be regenerated and sent to the tonydefazio.com session | `built` | `scripts/tile-svg.ts`; tonydefazio.com | `5c225e6` |
| KCC2 at 2.48 × 10⁻¹⁶ brings E_Cl to −85 mV; NKCC1 at 2.86 × 10⁻¹⁶ brings it to −36.5 mV and Vm to −59.9 mV | `measured` | `src/core/physics.test.ts` | `98282a8` |
| The homeostat's first level: carry Na⁺ and K⁺ by hand against the leaks; a carry is a flux through the zero-current solve | `built` | [ADR-0014](adr/0014-the-homeostat-is-a-game-beside-the-chapters.md); `src/chapters/Homeostat.tsx`; `npm run check` | `aeea69e` |
| A hand moving 3 Na⁺ out for 2 K⁺ in at the pump's rate is exactly the pump; a balanced extra flux leaves Vm alone | `measured` | `src/core/physics.test.ts` | `aeea69e` |

## Open

| what | waits on | blocks |
|---|---|---|
| **Swap the tonydefazio.com tile**: live there is 1.11.2, the rocker tile matching ionhomie v0.1.6. ionhomie v0.1.7 (7b29036) now carries the star-shaped ATP site (ADR-0019), so the staged tile matches the site; Tony's hold on tonydefazio.com updates (2026-10-22) stands, so the tonydefazio.com session has not been told | Tony lifting the hold, then his approval there | the tile matching the site |
| **Add the Na⁺/Ca²⁺ exchanger (NCX)?** Without it, Ca²⁺ stays low after ouabain even at 0 mV; with it, the collapsing Na⁺ gradient reverses NCX and loads Ca²⁺ (the digoxin mechanism). Changes the physics and pinned numbers | **Tony** | Ca²⁺ in the pumps and rundown chapters |
| **Dials in the running-cell chapters?** Tony: "graphs are hard for some to get used to". The dials are built for the game; rundown, pumps and chloride could carry them too | **Tony** | |
| **Voltage-dependent resting conductances** ([ADR-0015](adr/0015-resting-conductances-from-the-pyramidal-cell.md)): source decided (the pyramidal cell); the design is proposed, not built | **Tony**, to rule when built; proposed after the concentration view | the "What is the leak?" section and Rin readouts |
| **Tile label (optional)**: at phone width "K⁺ leak" sits against the tile's top edge; move it down a few px and resend? | **Tony** | a cosmetic tile update |
| **Rule on the details of ADR-0009**: the exact hues, and moving every number to the lecture's | **Tony** | settling the drawing and the presets |
| **Rule on the particles-depict-the-physics decision** ([ADR-0004](adr/0004-the-physics-computes-the-particles-depict.md), proposed) | **Tony** | nothing now; it is how the app is built |
| **Play through the GHK, rundown and pump chapters in order** and confirm or overturn the chapter arc | **Tony** | settling the arc |
| **Find and verify the reference numbers not in the lectures**: free-solution diffusion coefficients (K⁺ 1.96, Na⁺ 1.33, Cl⁻ 2.03, Ca²⁺ 0.79 × 10⁻⁹ m²/s); the squid preset and Hodgkin & Katz's (1949) ratio; Na⁺/K⁺-ATPase and PMCA activation constants; a published pump–leak model to check the rundown against. Each goes into `lit/sources.json` | Claude | calling those numbers sourced |
| **A card on tonydefazio.com** for ionhomie, once deployed | Tony | the estate's router |
| **Play the homeostat's first level** and rule on the rest of the game (ADR-0014): the limits, the clock, and whether the 20 s delivery makes each carry's Vm kick too large. Asked whether to ship the game now with only the hand level, Tony said *"yes one level is fine"* (2026-10-21) | **Tony** | the pump and chloride levels |
| **A one-way flux (tracer) view, later**: show each pore's influx, efflux and their ratio, so students see "lots of exchange, no net" at Cl⁻ (E_Cl = Vm), near-balance at K⁺ (~1.4 out per 1 in at rest) and nearly all-inward Na⁺; the radioactive-tracer experiments' idea. The model is GHK (independent crossings), so it cannot show single-file flux coupling (Hodgkin & Keynes 1955); say so. Prompted by the crossing traces from the ADR-0020 work. Tony, 2026-10-28: *"put it on the todo list. we need to focus on the current issues"* | after the current issues; then Tony's go-ahead | nothing |
