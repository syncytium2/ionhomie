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
| Deployed v0.1.2, the review round, to https://ionhomie.tonydefazio.com (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | see DEPLOYED.md |
| Deployed v0.1.1 to https://ionhomie.tonydefazio.com and https://ionhomie.tonydefazio.workers.dev (Tony: "deploy") | `built` | [`DEPLOYED.md`](../DEPLOYED.md) | `c7c4555` |
| Tony's review round built: two stated scales, one-way crossings, the charged rim, the nav bar, the balance, sampled playback | `built` | [ADR-0011](adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md), [0012](adr/0012-a-nav-bar-on-every-page.md), [0013](adr/0013-a-balance-beside-the-ruler.md); `npm run check` | `62da620` |
| KCC2 at 2.48 × 10⁻¹⁶ brings E_Cl to −85 mV; NKCC1 at 2.86 × 10⁻¹⁶ brings it to −36.5 mV and Vm to −59.9 mV | `measured` | `src/core/physics.test.ts` | `98282a8` |

## Open

| what | waits on | blocks |
|---|---|---|
| **Rule on the details of ADR-0009**: the exact hues, and moving every number to the lecture's | **Tony** | settling the drawing and the presets |
| **Rule on the particles-depict-the-physics decision** ([ADR-0004](adr/0004-the-physics-computes-the-particles-depict.md), proposed) | **Tony** | nothing now; it is how the app is built |
| **Play through the GHK, rundown and pump chapters in order** and confirm or overturn the chapter arc | **Tony** | settling the arc |
| **Find and verify the reference numbers not in the lectures**: free-solution diffusion coefficients (K⁺ 1.96, Na⁺ 1.33, Cl⁻ 2.03, Ca²⁺ 0.79 × 10⁻⁹ m²/s); the squid preset and Hodgkin & Katz's (1949) ratio; Na⁺/K⁺-ATPase and PMCA activation constants; a published pump–leak model to check the rundown against. Each goes into `lit/sources.json` | Claude | calling those numbers sourced |
| **A card on tonydefazio.com** for ionhomie, once deployed | Tony | the estate's router |
