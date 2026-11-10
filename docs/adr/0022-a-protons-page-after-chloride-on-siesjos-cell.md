# ADR-0022: A protons page after chloride, on Siesjö's cell, with its own small pH model

## Status

Accepted as a whole, 2026-11-10, then ruled choice by choice the same day (recorded in [ADR-0024](0024-a-co2-step-two-ways-and-a-legend-under-every-stage.md)); its separate model superseded by [ADR-0023](0023-h-and-hco3-join-the-shared-cell.md). Tony was shown the design mockup
([`docs/feedback/drafts/protons/`](../feedback/drafts/protons/protons.html)) and asked to rule on the cell, the place in the
arc, the separate model, the first transporters, the colors and the free-H⁺ dots. He answered *"don't forget a legend for
the ions. build it"*. Claude took that as approval of the design as proposed, plus a legend; he has not ruled on each
choice separately. The free-H⁺ question was built as the mockup suggested: both (dots in the census view, the ledger
beside the gauges).

What Tony has said, with the questions he was answering:
- To sour, after *"there's no part of sour that i can find that shows cellular proton homeostasis"*: *"ionhomie page now"*
  (recorded in syncytium2/sour, ADR 2026-11-10-d802).
- Here: *"prepare for a handoff to include proton homeostasis"*.
- Asked whether to start on the mockup and the Siesjö search: *"yes"*. That approved the mockup, not the design.
- Shown the mockup with the open choices: *"don't forget a legend for the ions. build it"*.

How it was carried out (2026-11-10, a note that changes no decision): built on branch `protons-design`, not deployed.
A key of glyphs (Na⁺, H⁺, HCO₃⁻, CO₂) sits under the stage, the first ion legend on any page. On the cell view free H⁺
appears only as rates (flux arrows, NHE rocking); the census view draws every free H⁺. With metabolic acid on, the
transport-stopped cell settles at pHi 6.25, below the passive 6.32; the page says so and offers a switch.

## Context

Cellular pH is held the way chloride is held: far from its passive distribution, by transporters that run on the Na⁺
gradient the pump built. The 578 lectures teach it with the Siesjö figure (the first slide of the 2025 sour taste deck),
the acid half of the acid/sour lecture, which Tony calls figure 0. At Vm −60 mV, with CO₂ equal on both sides, passive
pHi would be 6.3 and [HCO₃⁻]i 2.5 mM; the measured values are 7.0 and 12.5 mM. The figure is Fig. 8 of Siesjö BK,
"Acid-base homeostasis in the brain: physiology, chemistry, and neurochemical pathology", *Prog Brain Res* 1985;63:121–154
(PMID 3915123, doi:10.1016/S0079-6123(08)61980-9). Checked against the paper on 2026-11-10: Fig. 8 is on p. 132, with the slide's numbers and caption. The text adds
that −60 mV "was chosen to facilitate calculations" (true values −60 to −90 mV), gives the passive [HCO₃⁻]i as 2 mM
where the figure gives 2.5 (the Nernst equation gives 2.65), and names the Na⁺/H⁺ antiporter as probably the major
route of H⁺ extrusion (its Fig. 9).

sour (sour.tonydefazio.com) already runs NHE, NBC, CO₂ with carbonic anhydrase, and buffering, but draws none of it. It
handed the fundamentals to ionhomie and will link its Siesjö preset to this page.

## Decision (proposed)

- **One new page, "Protons", after Chloride** in the arc
  ([ADR-0001](0001-the-arc-runs-ghk-then-rundown-then-pumps.md)) and the nav bar. Its idea: H⁺ and HCO₃⁻ are held far from
  equilibrium by NHE and NBC running on the Na⁺ gradient; buffering means pH barely moves while a great deal of acid
  crosses.
- **Siesjö's cell**, Vm −60 mV and pHo 7.3, named on screen. It is the lecture's slide
  ([ADR-0009](0009-numbers-and-colors-follow-the-578-lectures.md)). A Vm slider moves the passive pHi (pHo + Vm/S, with
  S = RT·ln10/F = 61.5 mV at 37 °C), so the learner sees that where pHi would go depends on Vm. ionhomie's healthy cell
  (−80.3 mV, where passive pHi would be about 6.0 at pHo 7.3) can be offered as a second choice.
- **Its own small pH model**, `src/core/protons.ts` with its own tests, beside `physics.ts`, not inside it. Its state is
  total acid, with free H⁺ following from buffering
  ([ADR-0004](0004-the-physics-computes-the-particles-depict.md)). The running cell's `Ion` union stays unchanged until
  Tony decides whether H⁺ joins the other chapters.
- **The first build carries** NHE1 (Na⁺ in, H⁺ out, electroneutral), NBC (Na⁺ and HCO₃⁻ in), CO₂ crossing the lipid
  freely with carbonic anhydrase treated as instant, an H⁺ leak, metabolic acid made inside, and buffering
  (β_i plus the open CO₂/HCO₃⁻ system). MCT, AE, the V-ATPase and the astrocyte shuttle are left for later.
- **The views**: an E_H tick on the voltage ruler (labeled "= E_HCO₃" while CO₂ is equal), pH and HCO₃⁻ gauges with the
  passive value marked, gray rocking NHE and NBC proteins ([ADR-0017](0017-transport-proteins-rock-they-do-not-spin.md),
  [ADR-0018](0018-the-pump-carries-its-atp.md)), a buffer ledger on its own stated scale
  ([ADR-0011](0011-every-dot-and-crossing-is-on-a-stated-scale.md)), the clock factor always shown, and a prediction
  prompt first ("Switch off NHE and NBC. Where does pHi go?").
- **Colors and glyphs**: H⁺ reddish purple `#cc79a7`, a small circle marked +; HCO₃⁻ orange `#e69f00`, a triangle marked
  −; CO₂ a hollow gray circle. Okabe–Ito hues, as ADR-0009 asks; the glyph carries the charge.

## Open within this proposal

- **Free H⁺ as dots.** sour argues no: dots invite counting and hide the bound H⁺. The census of 1 µm³ holds about 60 free
  H⁺ at pH 7.0, which is countable on a stated scale. The mockup shows both, and suggests carrying both (dots in the
  census view, the ledger beside the gauges). Tony to choose.
- **Rate constants.** sour's (NHE with pK 6.9 and Hill n 2; β_i 10 mM/pH; a 0.02 mM/s acid load) are illustrative. Each
  needs a source in `lit/sources.json` or a label saying it is illustrative.

## Consequences

- FOUNDATIONS' spine gains a Protons row (marked proposed) in the same change as this ADR.
- With β_i at 10 mM/pH, about 45,000 H⁺ are bound for every one that stays free as pHi falls from 7.0 to 6.3. The charge
  ledger's figure is about one ion in 45,000. The coincidence comes from an illustrative β_i, so the page must not present
  it as a law.
- The physics core and its pinned numbers are untouched, so the NCX work (ADR-0021) and this page cannot collide.
- When the page is live, its route goes to a sour session for the Siesjö preset's link.
