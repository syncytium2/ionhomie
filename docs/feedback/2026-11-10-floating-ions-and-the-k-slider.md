# Tony on the chloride page and floating ions, v0.1.8, 2026-11-10

> *"chloride page needs an extracellular K+ slider similar to the defazio paper showing K+ dependent accumulation blocked
> by furosemide in cortical neurons (i think we tried in gnrh too). also note that ions are still floating on proteins. i
> thought we were going to make this not possilbe"*

| note | what changed |
|---|---|
| Ions floating on proteins | Fixed: a free ion can no longer enter a channel's or protein's footprint; only bound or crossing ions are drawn there ([ADR-0018](../adr/0018-the-pump-carries-its-atp.md), amended). Free dots on a pathway: 9–16 per frame before, 0 after. |
| A bath K⁺ slider, as in DeFazio et al. 2000 | Not built yet: waits on Tony's choice of design (below). |

## The K⁺ slider: why it needs a design choice

DeFazio, Keros, Quick & Hablitz 2000 (J Neurosci 20:8069, doi:10.1523/JNEUROSCI.20-21-08069.2000), mature rat neocortical
pyramidal neurons: raising or lowering bath K⁺ moved intracellular Cl⁻ with it, through KCC2. Furosemide's effect depended on
pipette Cl⁻, and neonatal neurons (little KCC2) showed no K⁺ effect. DeFazio et al. 2002 (Mol Endocrinol 16:2872) found no
functional KCC2 in GnRH neurons and showed NKCC blockade lowering their Cl⁻; its abstract does not mention a K⁺ test.

Simulated in this model (KCC2 preset; 30,000 s to steady state):

| bath K⁺ | free-running cell, KCC2 | free-running, KCC2 blocked | Vm and K⁺ inside held, KCC2 ×10 | held, blocked |
|---|---|---|---|---|
| 2.5 mM | E_Cl −100.9 mV | −91.2 | −104.2 | −70.0 |
| 5 | −85.0 | −80.3 | −87.1 | −70.0 |
| 10 | −69.0 | −67.0 | −71.1 | −70.0 |
| 15 | −59.8 | −58.6 | −62.6 | −70.0 |

In the free-running cell, E_Cl follows bath K⁺ almost as much without KCC2 as with it: Vm follows E_K, and the large Cl⁻ leak
(half of P_K, the lecture's ratio) drags Cl⁻ with Vm. The paper's recordings held Vm, and the pipette set K⁺ inside. Holding
both reproduces the result: with KCC2, E_Cl tracks E_K and Cl⁻ is loaded above ~10 mM bath K⁺; blocked, it stays at the holding
potential. KCC2 must be ~10× the free-cell preset, or the Cl⁻ leak ~10× smaller, for the effect to be as large as E_K's swing.
