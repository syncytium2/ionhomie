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
| Bath K⁺ moves E_Cl through KCC2 only under a clamp: with Vm held at −70 mV and K⁺ inside held, KCC2 ×10 takes E_Cl from −104.2 to −62.6 mV as bath K⁺ goes 2.5 → 15 mM; blocked, it stays at −70 mV. Free-running and blocked, E_Cl still shifts 21.7 mV from 5 to 15 mM (DeFazio et al. 2000, J Neurosci 20:8069) | `measured` | `src/core/physics.test.ts`; the chloride page | see git log |
| Free ions cannot sit on a channel or protein: 9–16 per frame before, 0 after (Tony: "ions are still floating on proteins") | `built` | [ADR-0018](adr/0018-the-pump-carries-its-atp.md), amended | `f41a96e` |
| NCX, the Na⁺/Ca²⁺ exchanger (3 Na⁺ : 1 Ca²⁺): forward at rest (E_NCX −56.24 mV), carrying half the resting Ca²⁺ extrusion (illustrative); after 30 min of ouabain it has reversed and Ca²⁺ is 2.6 µM (it fell to 0.07 µM without NCX); every earlier pin unchanged (Tony: "yes to ncx") | `measured` | [ADR-0021](adr/0021-the-na-ca-exchanger-runs-on-the-na-gradient.md); `src/core/physics.test.ts` | `381787b` |
| The protons page: Siesjö's cell held at pHi 7.0 by NHE1 and NBC; stopping both lets it fall to the passive 6.32 (6.25 with metabolic acid on); about 45,000 H⁺ bound per free one on the way; the first ion legend; not deployed | `built` | [ADR-0022](adr/0022-a-protons-page-after-chloride-on-siesjos-cell.md); `src/core/protons.test.ts`; `npm run check` | see git log |
| Crossed dots wander off before crossing again, scarce dots set the thinning, every stage wanders at 26 px/√s: ions no longer shuttle at the pores (Tony: "trapped moving in and out of the channel"); not deployed | `built` | [ADR-0020](adr/0020-a-crossed-dot-wanders-off-before-it-crosses-again.md) | see git log |
| Deployed v0.1.9: the chloride page's bath K⁺ slider, furosemide and clamp (DeFazio et al. 2000), and free ions kept off proteins; the protons page held back (Tony: "protons is still influx. deploy without it") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | `5236445` |
| Deployed v0.1.8: NCX on the pumps page (ADR-0021: it reverses after ouabain and loads Ca²⁺) and crossed dots wander off before crossing again (ADR-0020), which trims, not removes, the Cl⁻ pile-up at busy leaks (still open) (Tony: "deploy so i can remember what you were fixing") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | `1d3957e` |
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
| **Rule on NCX's details** ([ADR-0021](adr/0021-the-na-ca-exchanger-runs-on-the-na-gradient.md)): the 50% share of resting Ca²⁺ extrusion, the linear rate law, and the drawing are Claude's; find a source for the share and compare a published NCX model | **Tony**; the source, Claude | calling NCX's numbers sourced |
| **Chloride page on hold while Tony reviews v0.1.9** (the bath K⁺ slider, furosemide and the clamp). Change nothing on it until he reports back. Tony, 2026-11-10: *"let's hold on chloride for now while i review"* | **Tony** | every chloride item below |
| **Follow-up: lower the neuron's resting Cl⁻ leak?** The lecture's 1 : 0.02 : 0.5 makes pCl half of pK, so in the free-running cell Cl⁻ follows Vm and KCC2 moves E_Cl only a few mV; the chloride page needs a clamp and KCC2 ×10 to show DeFazio et al. 2000. A neuron's resting pCl is likely far smaller; ~10× smaller would let KCC2 set E_Cl without a clamp. It changes [ADR-0009](adr/0009-numbers-and-colors-follow-the-578-lectures.md)'s ratio and re-pins every chloride and GHK number; find a source for a neuron's resting pCl first. Tony, 2026-11-10: *"make a todo on the last point of lowering cl- leak for follow up"* | **Tony**, after a source | KCC2 and NKCC1 acting without a clamp |
| **The Cl⁻ pile-up at busy leaks**: after the NKCC1 preset, Cl⁻ still crowds the Cl⁻ leak (live since v0.1.7; ADR-0020 trims it, not removes it). The stage has too few dots near each pore for the crossings it asks for, so either dots are reused (shuttling), walk in from afar (a crowd), or crossings are dropped (a quiet, skewed pore). Measured in [the 2026-11-10 feedback](feedback/2026-11-10-ncx-and-the-pile-up.md) | **Tony**: denser dots on the scarce side, a slower shown rate, or some reuse | the chloride page looking right |
| **Dials in the running-cell chapters?** Tony: "graphs are hard for some to get used to". The dials are built for the game; rundown, pumps and chloride could carry them too | **Tony** | |
| **Voltage-dependent resting conductances** ([ADR-0015](adr/0015-resting-conductances-from-the-pyramidal-cell.md)): source decided (the pyramidal cell); the design is proposed, not built | **Tony**, to rule when built; proposed after the concentration view | the "What is the leak?" section and Rin readouts |
| **Tile label (optional)**: at phone width "K⁺ leak" sits against the tile's top edge; move it down a few px and resend? | **Tony** | a cosmetic tile update |
| **Rule on the details of ADR-0009**: the exact hues, and moving every number to the lecture's | **Tony** | settling the drawing and the presets |
| **Rule on the particles-depict-the-physics decision** ([ADR-0004](adr/0004-the-physics-computes-the-particles-depict.md), proposed) | **Tony** | nothing now; it is how the app is built |
| **Play through the GHK, rundown and pump chapters in order** and confirm or overturn the chapter arc | **Tony** | settling the arc |
| **Find and verify the reference numbers not in the lectures**: free-solution diffusion coefficients (K⁺ 1.96, Na⁺ 1.33, Cl⁻ 2.03, Ca²⁺ 0.79 × 10⁻⁹ m²/s); the squid preset and Hodgkin & Katz's (1949) ratio; Na⁺/K⁺-ATPase and PMCA activation constants; a published pump–leak model to check the rundown against. Each goes into `lit/sources.json` | Claude | calling those numbers sourced |
| **A card on tonydefazio.com** for ionhomie, once deployed | Tony | the estate's router |
| **Play the homeostat's first level on a phone** and rule on the rest of the game (ADR-0014). It runs at 100× with an hour's hold (NA_MAX 30, K_MIN 110, handTau 20). Open: at 100×, is 20 s of delivery right (each dot's Vm kick passes in about 0.2 real seconds)? Are the dots big enough to tap? Tony, on shipping with one level: *"yes one level is fine"* (2026-10-21). The pump and chloride levels are designed in ADR-0014, not built; their rules are in [the game's handoff](handoffs/2026-10-23-the-homeostat-game.md) | **Tony** | the pump and chloride levels |
| **A one-way flux (tracer) view, later**: show each pore's influx, efflux and their ratio, so students see "lots of exchange, no net" at Cl⁻ (E_Cl = Vm), near-balance at K⁺ (~1.4 out per 1 in at rest) and nearly all-inward Na⁺; the radioactive-tracer experiments' idea. The model is GHK (independent crossings), so it cannot show single-file flux coupling (Hodgkin & Keynes 1955); say so. Prompted by the crossing traces from the ADR-0020 work. Tony, 2026-10-28: *"put it on the todo list. we need to focus on the current issues"* | after the current issues; then Tony's go-ahead | nothing |
| **Confirm the protons page's choices and source** (ADR-0022, accepted as a whole on *"build it"*): Siesjö's cell, the place after Chloride, the separate model, NHE + NBC + CO₂/CA + leak + metabolic acid, H⁺ `#cc79a7` and HCO₃⁻ `#e69f00`, free H⁺ as dots in the census and as a ledger. The Siesjö citation (Prog Brain Res 63:121–154, Fig. 8, p. 132; doi:10.1016/S0079-6123(08)61980-9) is checked against the paper. Then "deploy", and send the route to sour | **Tony** | the deploy; sour's Siesjö preset linking to the page |
