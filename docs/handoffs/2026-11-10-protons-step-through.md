# Handoff 2026-11-10: the protons step-through, and the enzyme's point of view next

Written by `ionhomie-deep-heron` before context compaction. [`MILESTONES.md`](../MILESTONES.md) is the authority for what is open.
This says where things stand, what Tony asked for next, and the traps.

Derive rather than trust: `git log --oneline -8 origin/main` · `git branch -r` · `cat DEPLOYED.md` · `ls docs/adr` ·
`sed -n '/## Open/,$p' docs/MILESTONES.md`.

## Where it stands

- **Live: v0.1.11** (main 2a3aeb0, pushed). It has H⁺ and HCO₃⁻ in the shared cell
  ([ADR-0023](../adr/0023-h-and-hco3-join-the-shared-cell.md)), the protons page with Siesjö's figure, both CO₂ steps and an ion
  legend under every stage ([ADR-0022](../adr/0022-a-protons-page-after-chloride-on-siesjos-cell.md),
  [0024](../adr/0024-a-co2-step-two-ways-and-a-legend-under-every-stage.md)), labels over the ions, and carbonic anhydrase (CA) at its
  net ([0025](../adr/0025-labels-over-the-ions-and-carbonic-anhydrase-at-its-net.md)).
- **Pushed, not merged or deployed:**
  - `ca-legend` (dba2d60), [ADR-0026](../adr/0026-carbonic-anhydrase-on-the-dots-scale-its-equation-in-the-legend.md): CA's
    conversions use the cell's own HCO₃⁻ dots, at the dots' scale and thinning; CA's glyph and equation move into the legend.
    Tony's complaint that this fixes: *"CA consumes a lot more bicarb than present in the visual"*.
  - `protons-steps` (this branch, built on `ca-legend`), [ADR-0027](../adr/0027-the-protons-page-steps-through-its-players.md): the
    step-through rulings and a working mockup of the first two steps, `docs/feedback/drafts/protons-steps/steps.html`. The
    latest copy in the darkroom is `explainer_ionhomie-protons-steps-mockup-v3_20261110.html`.
- **Tony's standing rule: push regularly** (he switches machines without warning). Push after commits worth keeping, and push
  main right after every deploy. Deploy only on his word.

## The step-through (ADR-0027)

Six steps, the page opening in step-through, with "Skip to the whole cell":
1. the reaction in a box (no cell);
2. buffers, and CA;
3. the cell, with the pump and NHE1;
4. NBC;
5. the proton leak and Vm;
6. the whole cell, as the page is today.

The middle steps use the whole cell, with only the players introduced so far. The mockup of the first two steps shows the
dynamic equilibrium three ways (Tony: *"how do we show the dynamic equilibrium? ... not conveyed by the image"*):
- conversions both ways in the box, at the arrows' rates (thinned alike when too fast, and the box says so);
- running totals for each direction beside the net;
- one carbon followed.

Under the equation, each term has its symbol; water is "the solvent", not "55 M". Tony asked whether a concentration of water
is fair: water's activity is about 1, folded into K.

Physics found while building the mockup:
- In plain solution, adding 1 mM CO₂ converts only about 33 nM, and pH falls 7.40 → 7.14. In under a millisecond, with or
  without the enzyme: CA's effect is invisible there.
- With a buffer (25 mM, pK 6.9), 0.75 mM converts, and pH falls 7.40 → 7.33. Without CA this takes about 20 s (τ ≈ 6 s); with
  CA, one frame. So CA arrives with the buffers.
- Placeholders to source: uncatalyzed hydration 0.13 s⁻¹ at 37 °C; the buffer's 25 mM and pK 6.9.

## What Tony asked for next

> *"i want to try starting with animating it from the point of view of the enzyme"* · *"nice structural paper in downloads"*

The paper is Domsic JF, Avvaru BS, Kim CU, Gruner SM, Agbandje-McKenna M, Silverman DN, McKenna R (2008), "Entrapment of carbon
dioxide in the active site of carbonic anhydrase II", J Biol Chem 283:30766–30771, doi:10.1074/jbc.M805353200
(`~/Downloads/PIIS002192582064649X.pdf`). It shows CO₂ captured in CA II's active site at 1.1 Å in CO₂-pressurized,
cryo-cooled crystals, with and without zinc. Read it before designing: the active site's geometry (the zinc, its bound
hydroxide, the hydrophobic pocket that holds CO₂, and the water network that carries the proton out) is what an animation from
the enzyme's point of view would draw. Silverman is also the name behind the ¹⁸O exchange method for measuring CA at
chemical equilibrium. That is still unverified; check it before saying so on a page.

A sketch of the idea, not decided: open on the enzyme, large, its catalytic cycle running. CO₂ enters the pocket; zinc-bound
OH⁻ attacks it; HCO₃⁻ leaves; water binds the zinc; a proton goes out through the water network and His64, regenerating
zinc-OH⁻. Then run the same cycle backward, and zoom out to the box where both directions run at once: the dynamic
equilibrium seen from inside the catalyst. Put it to Tony as a mockup, as the first two steps were.

## Also open (in MILESTONES)

- Tony's review of the step-through mockup, then building the six steps.
- From the prior-art search (PhET's Reversible Reactions; radioactive-iodide tracer demonstrations; buffer-misconception
  studies; nothing interactive for CA): rename the followed carbon as a ¹⁴C label; consider a plot of the forward and backward
  rates over time. Offered, not yet ruled on.
- **Water, held:** a model note (pyramidal neurons lack functional aquaporins and hold their volume against osmotic shifts,
  Andrew et al. 2007, doi:10.1093/cercor/bhk032; astrocytes, with AQP4, swell, Risher et al. 2009, doi:10.1002/glia.20747;
  cotransporters carry water, MacAulay & Zeuthen 2009, doi:10.1016/j.neuroscience.2009.09.016) and a net water arrow, offered.
- Merging and deploying `ca-legend`, on Tony's word.

## Other sessions

- "mac ionhomie cleanup" (`uds:/tmp/cc-socks/47423.sock`) built NCX and the chloride clamp, and knows the ADR numbers. It was told
  each time main moved. **The next free ADR number is 0028.**
- "mac sour figure 0" (`uds:/tmp/cc-socks/42687.sock`) links sour's Siesjö preset to `https://ionhomie.tonydefazio.com/#/protons`.

## Traps from this session

- **A pinned number can expose a physics error.** Twice a finite-difference check caught a wrong formula: CA's net rate
  ignored the volume's change, and the metabolic acid broke electroneutrality, so K⁺ piled up. Check a new rate against its
  own consequence before drawing it.
- **Advice turned out wrong twice, and the model said so:** CA does not run forward during recovery with pHo held, and
  rundown alone does not acidify this cell. Say what the model shows, and correct the record.
- **`label{display:flex}` overrides the `hidden` attribute.** Add `[hidden]{display:none!important}`.
- **Playwright scrolls a clicked control into view**, so `scripts/check.mjs` scrolls back to the top before it measures.
- **Two scales for one ion on one stage is the mismatch ADR-0011 forbids, even when both are stated** (ADR-0026).
