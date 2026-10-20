# Architecture Decision Records

One decision per file, recorded when it is made. The form is the one `colonel_kernel`,
`bugarach` and `ml2dl` use, so it reads the same here as there.

Where this sits against the rest of `docs/`:

- **[`FOUNDATIONS.md`](../FOUNDATIONS.md)**: what the project is, how its ideas relate, and
  what must not be inferred. Canonical; it wins over conversation and over anything here.
- **[`GLOSSARY.md`](../GLOSSARY.md)**: what each word means, each ion's color and glyph, and
  how figures label things.
- **ADRs (this directory)**: the individual decisions, as they are taken.
- **[`MILESTONES.md`](../MILESTONES.md)**: what has been built, measured or decided, pinned to
  commits, and what is open.

When an ADR changes a settled point in `FOUNDATIONS.md`, update `FOUNDATIONS.md` in the same
change so the two never disagree.

## Convention

- One decision per file, `NNNN-title-in-kebab-case.md`, zero-padded, incrementing.
- **Michael Nygard template**: Title, Status, Context, Decision, Consequences.
- **Status** is `Proposed`, `Accepted`, `Deprecated`, or `Superseded by ADR-NNNN`. The status
  line says who decided and when, quoting Tony's own words where there are any. A decision Claude made and
  Tony has not ruled on says so.
- Accepted ADRs are immutable. To change a decision, write a new ADR that supersedes it and
  update the old one's status line; do not edit the history.
- In-place amendments are allowed only when they change no decision: a dated correction, or
  a note recording how the decision was carried out.
- A decision taken in conversation is not recorded until it has an ADR. `CLAUDE.md` holds no
  decisions; it only points here.
- When prose refers to an ADR, it names the decision, not just the number: "the chapter arc
  ([ADR-0001](0001-...))", not "see 0001".

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-the-arc-runs-ghk-then-rundown-then-pumps.md) | The arc runs GHK, then rundown, then pumps | Accepted (Tony, on trial) |
| [0002](0002-the-learners-are-graduate-and-medical-students.md) | The learners are graduate and medical students | Accepted |
| [0003](0003-react-like-gaba-excites.md) | React, uPlot and a worker, like gaba_excites | Accepted (Tony chose React; the rest is Claude's, not ruled on) |
| [0004](0004-the-physics-computes-the-particles-depict.md) | The physics computes; the particles only depict it | Proposed (Claude; Tony has not ruled) |
| [0005](0005-two-dimensions-first.md) | Two dimensions first | Accepted |
| [0006](0006-proof-of-principle-pages-are-single-html-files.md) | The proof-of-principle pages are single HTML files that refuse every request | Accepted; superseded as the product by ADR-0010 |
| [0007](0007-the-name-is-ionhomie.md) | The name is ionhomie, on GitHub as syncytium2/ionhomie | Accepted (Tony) |
| [0008](0008-lead-with-the-action.md) | Lead with the action; the stamp sits beside the title | Accepted (Tony); its title row superseded by ADR-0012 |
| [0009](0009-numbers-and-colors-follow-the-578-lectures.md) | The numbers and the ion colors follow the Physiol 578 lectures | Accepted (Tony asked; the details are Claude's, not ruled on) |
| [0010](0010-the-app-is-react-on-the-ported-core.md) | The app is React over the ported core, one route per chapter | Accepted (Tony asked; the structure is Claude's, not ruled on) |
| [0011](0011-every-dot-and-crossing-is-on-a-stated-scale.md) | Every dot and every crossing is on a stated scale, and the scales agree | Accepted (Tony's review; the design is Claude's) |
| [0012](0012-a-nav-bar-on-every-page.md) | A nav bar on every page: brand and stamp, then every chapter | Accepted (Tony) |
| [0013](0013-a-balance-beside-the-ruler.md) | A balance beside the ruler, and a zero line with weight | Accepted (Tony asked; the forms are Claude's) |
| [0014](0014-the-homeostat-is-a-game-beside-the-chapters.md) | The homeostat is a game beside the chapters, and a hand's carry goes through the physics | Proposed (Tony asked for the game; the design is Claude's) |
| [0015](0015-resting-conductances-from-the-pyramidal-cell.md) | Resting conductances come from gaba_excites's pyramidal cell | Accepted in part (Tony chose the source; the rest is proposed, not built) |
| [0016](0016-the-learner-picks-how-the-stage-shows-concentrations.md) | The learner picks how the stage shows concentrations | Accepted (Tony chose all three; the forms are Claude's) |
