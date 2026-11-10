# Handoff 2026-11-10: protons next

Written by session `ionhomie-deep-heron`, which prepared this handoff and built nothing. Tony, 2026-11-10: *"prepare for a
handoff to include proton homeostasis"*. [`MILESTONES.md`](../MILESTONES.md) is the authority for what is open; this file says
where things stand, scopes the proton page, and lists the traps. The previous handoff
([2026-10-23](2026-10-23-after-the-pump-and-transporter-rounds.md)) still holds for its traps and working rules; its
"where it stands" section is out of date (v0.1.7 has since deployed).

Derive rather than trust: `git log --oneline -15` · `cat DEPLOYED.md` · `sed -n '/## Open/,$p' docs/MILESTONES.md` ·
`ls docs/adr` · `git worktree list` · `git log --oneline main..origin/claude/wizardly-noether-thf1q6` · `npm run check`.

## Where it stands

- **Live: v0.1.7** (release 7b29036, deployed 2026-10-28) at https://ionhomie.tonydefazio.com: the pump carries its ATP
  ([ADR-0018](../adr/0018-the-pump-carries-its-atp.md)), ATP is a star in a star-shaped site
  ([ADR-0019](../adr/0019-atp-is-a-star-and-the-census-is-a-panel.md)), and a blocked pump halts mid-cycle.
- **main (b175ce5) equals live**, apart from the commit recording the deploy.
- **Another session is working in this repo now**: "mac ionhomie cleanup" (`uds:/tmp/cc-socks/47423.sock`), in
  `../ionhomie-worktrees/ncx-and-pileup` (branch `ncx-and-pileup`). Tony, 2026-11-10: *"there's another session cleaning up
  calcium and chloride. work independently"*. It is building **the Na⁺/Ca²⁺ exchanger (Tony said yes)** and the leak pile-up
  fix. In `physics.ts` it adds `Cell.ncx`, NCX current in `netCurrent`, `Snapshot.ncx`, and an `ncxShare` argument to
  `healthyState`; `Ion`, `IONS` and `Bath` stay untouched. It also changes `draw.ts` (an "ncx" pathway), `lab.ts`, and the
  pumps and rundown text. **Do not edit its worktree.**
- **Agreed order**: NCX merges to main first, after Tony's word "deploy". Then the proton work branches from it, or
  rebases onto it, before touching `Ion` or `healthyState`. Scoping and questions to Tony conflict with nothing. If the
  proton work needs `physics.ts` sooner, message that session and agree who goes first. It will send a message when NCX
  is on main.
- **ADR numbers**: 0020 belongs to `origin/claude/wizardly-noether-thf1q6`, ADR-0020, "a crossed dot wanders off before it
  crosses again" (a cloud session, 2026-10-28; Tony: *"trapped moving in and out of the channel"*). The cleanup session is
  merging that branch into its own, because it fixes the same pile-up. It claims 0021 for NCX. **The proton work starts at
  0022.** Check `ls docs/adr` before numbering anyway.
- **tonydefazio.com: on hold** since Tony's words on 2026-10-22, *"hold on the tonydefazio.com updates for now"*. Nothing
  has lifted it. Send that session nothing.

## Proton homeostasis: "figure 0", one new page

**The brief comes from sour. Read it first:** `/Users/tonydefazio/Developer/sour/docs/projects/sour/log/2026-11-10-figure-0-to-ionhomie.md`
(syncytium2/sour, main 9fb737d). sour's decision is recorded there as
`docs/adr/2026-11-10-d802-cellular-proton-homeostasis-is-an-ionhomie-page-sour-links-t.md`. Tony, to sour, 2026-11-10:
*"ionhomie page now"*, after *"there's no part of sour that i can find that shows cellular proton homeostasis."*

What is **decided**, in sour: cellular proton homeostasis is built as **one ionhomie page**, by an ionhomie session, under
ionhomie's ADRs. sour links to it from its Siesjö preset. Neither app imports the other's code.

What is **not yet decided in ionhomie**: everything about the page. This needs an ionhomie ADR (it extends the chapter arc,
[ADR-0001](../adr/0001-the-arc-runs-ghk-then-rundown-then-pumps.md)) and a FOUNDATIONS update in the same change. **Halt for
Tony's review of a design before building past it. Deploy only on his word "deploy".**

### The core of the page: the Siesjö figure

From the first slide of `01-lit/sour/578_2025_sour_taste.pptx` in Tony's Dropbox. At Vm −60 mV, CO₂ equal on both sides:

| | outside | inside |
|---|---|---|
| passive distribution | pHo 7.3, [HCO₃⁻]o 25 mM | pHi 6.3, [HCO₃⁻]i 2.5 mM |
| actual distribution | pHo 7.3, [HCO₃⁻]o 25 mM | pHi 7.0, [HCO₃⁻]i 12.5 mM |

and "uphill transport": H⁺ out, HCO₃⁻ in. E_H = −18 mV at pHi 7.0, so with Vm at −60 mV, H⁺ is driven in by 42 mV.
Pin the consistency in `physics.test.ts`: passive pHi = pHo + Vm/S with S = RT·ln10/F = 61.5 mV at `T37`, and with CO₂
equal, E_HCO₃ = E_H.

**The Siesjö source paper is not identified.** Label it "after Siesjö, source pending" and ask Tony. Never invent the
citation. The context slides (`578/578 lectures/578 2024 lecture 1.4 acid.pptx`, slides 2–4) cite Theparambil et al. 2020,
*Nat Commun* (doi:10.1038/s41467-020-18756-3) and Becker 2019, *Br J Cancer* (doi:10.1038/s41416-019-0642-z), both verified
in PubMed by sour on 2026-11-10. The decks are in Dropbox, not in git; the Dropbox tools can read them.

### Why it fits ionhomie's spine

- **Far from equilibrium, held by transporters running on the Na⁺ gradient.** This is the chloride chapter's argument
  again: NHE (Na⁺ in, H⁺ out, electroneutral) and NBC (Na⁺ and HCO₃⁻ in) run on the gradient the pump built. It also
  carries FOUNDATIONS' "not every ion has its own pump".
- **The voltage ruler carries it**: an E_H tick at −18 mV, with the needle well below it. Switch transport off and the
  tick slides down to the needle, the same reading as the E_Cl tick.
- **Buffering is the charge ledger's twin.** Nearly every proton that enters is bound (β_i ≈ 10 mM/pH, plus
  2.3·[HCO₃⁻]i), so "pH barely moved, but a lot of acid crossed" is the same lesson as "Vm moved, but hardly any ions
  crossed". The page shows it on its own stated scale ([ADR-0011](../adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md)).
  The Ca²⁺ cleanup may face the same missing buffer; the pumps page says "there is no Ca²⁺ buffering". Compare notes so
  the two buffers are drawn alike.
- **E_GABA**: E_HCO₃ explains why GABA_A's bicarbonate permeability pulls E_GABA positive of E_Cl, a caveat the chloride
  chapter already names.
- **Rundown**: with the Na⁺ gradient gone (ouabain, ischemia), NHE and NBC slow and the cell acidifies. That is a later
  link, not the first build.

### Questions for Tony (add them to MILESTONES' Open table with the design)

1. **Which cell does the page use?** Siesjö's (Vm −60 mV, pHo 7.3) or ionhomie's healthy cell (Vm −80.3 mV, where
   passive pHi would be about 6.1)? sour's taste cell sits at −67 mV with pHo 7.4. sour's advice: don't reconcile the
   numbers across apps; name the cell on screen, and perhaps let a Vm slider move the passive pHi.
2. **Where does it sit in the arc?** After chloride (the same argument), or beside it as its own page.
3. **Which transporters are in the first build?** sour suggests NHE, NBC, CO₂ with carbonic anhydrase, the H⁺ leak, and
   metabolic acid. MCT and AE are optional. The V-ATPase and the astrocyte shuttle are out of scope for now.
4. **The Siesjö source.**
5. **Numbers source.** [ADR-0009](../adr/0009-numbers-and-colors-follow-the-578-lectures.md) ties numbers to the 578
   lectures, and the Siesjö slide is a 578 slide, which argues for Siesjö's cell.
6. **Color and glyph for H⁺ and HCO₃⁻.** ADR-0009 keeps ion colors apart under color-vision deficiency (Okabe–Ito). The
   free hue farthest from the current set is reddish purple, `#cc79a7`; lavender `#b4b9ff` is taken by links. This
   proposal is mine, and Tony has not ruled.
7. **Free H⁺ as dots, or not?** The two sessions disagree. sour: at pH 7, free H⁺ is 100 nM, "a handful of ions in a
   census volume", and drawing them as dots would mislead. Mine: about 60 per µm³ (1 µM ≈ 602 ions/µm³) is countable, and a
   few dozen free H⁺ beside millimolar bound H⁺ on the census panel
   ([ADR-0016](../adr/0016-the-learner-picks-how-the-stage-shows-concentrations.md)) could be the buffering picture
   itself, on a stated scale. Put both to Tony with a mockup.

### Reference implementation (read it, do not import it)

sour's pH block, `src/core/model.ts` (from `let acid = …` to `c.pHi -= …`), with `src/core/params.ts` and the `siesjo`
preset in `src/core/presets.ts`:

- dpHi/dt = −(acid load − base − J_NHE) / β_total
- J_NHE = Vmax / (1 + 10^(n(pHi − pK))), pK 6.9, n 2, with Vmax set so that pHi rests at 7.2 against a 0.02 mM/s
  metabolic acid load
- β_total = β_i (10 mM/pH) + 2.3·[HCO₃⁻]i
- CO₂ hydration at 0.1 s⁻¹ uncatalyzed, ×100 with carbonic anhydrase (capped for numerics; the true factor is ~10⁴),
  pK 6.1

Most of these numbers are illustrative, not sourced. Say so on the page, and start `lit/sources.json` (MILESTONES refers
to it, but it does not exist yet).

### What the build touches (so it can be sized)

- **Coordinate with the cleanup session first** (the agreed order above). The option that collides least is a page with **its own small pH model**
  (for example `src/core/protons.ts` with its own tests), drawn with the shared views. The `Ion` union in
  `physics.ts` stays untouched until Tony decides whether H⁺ joins the running cell. Folding H⁺ into the main cell means
  widening `Ion` and `IONS`, `ION_Z`, `Bath`, `osmolarity`, `amountsFor` and `healthyState`, and re-pinning every number:
  the same files the cleanup is changing.
- **State is total acid, not free H⁺**; free H⁺ follows from β. This is the "physics computes" rule
  ([ADR-0004](../adr/0004-the-physics-computes-the-particles-depict.md)) applied to binding. NHE and AE are electroneutral;
  NBCe1 is electrogenic.
- **Views**: `Species`, `VAR`, `LABEL` and `Z` in `src/views/draw.ts`; a ruler tick for E_H; gauges (already log-scaled,
  so nanomolar fits; decide pH or [H⁺] and label it); gray, rocking NHE and NBC proteins
  ([ADR-0017](../adr/0017-transport-proteins-rock-they-do-not-spin.md), [ADR-0018](../adr/0018-the-pump-carries-its-atp.md));
  a pH dial (`dials()` exists); the clock factor on screen if the leak is sped up (sour speeds it 10×); and a prediction
  prompt first ("Switch off NHE and NBC. Where does pHi go?" with the choices 7.2, 7.4 and about 6.3).
- **Layout**: a new route needs a nav-bar entry ([ADR-0012](../adr/0012-a-nav-bar-on-every-page.md)) and must pass
  `scripts/check.mjs` (action first; a stage that draws no ions fails).

### When the page is live

Send its route (`https://ionhomie.tonydefazio.com/#/…`) to a sour session. sour's Siesjö preset will link to it, and an
item in sour's OPEN table waits on it. The sour session that wrote the brief was `sour-52`
(`uds:/tmp/cc-socks/42687.sock`); it may be gone, so use `ListAgents`.

## Waiting on Tony

1. A design for the proton page, with the questions above, before any build past it.
2. **"deploy"** for the cleanup session's NCX and pile-up round, which carries ADR-0020 and ADR-0021.
3. The voltage-gated resting channels, dials in the running-cell chapters, and the rest of MILESTONES' open table.
4. Lifting the tonydefazio.com hold.

## How work is done here (unchanged)

Take a worktree before committing (`git worktree add ../ionhomie-worktrees/<slug> -b <slug>`; never `git add -A`). Record
decisions as ADRs (the proton work from 0022), pin MILESTONES rows to commits, and quote Tony in `docs/feedback/`. Before shipping motion, capture frame
sequences and look at them. The dev server port is 5190. Write American spelling, "data" plural, no bare enumerated labels,
they/them for Tony. The previous handoff's traps all still apply.
