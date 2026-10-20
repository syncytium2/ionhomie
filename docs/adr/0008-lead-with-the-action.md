# ADR-0008: Lead with the action; the stamp sits beside the title

## Status

*The single title row is superseded by [ADR-0012](0012-a-nav-bar-on-every-page.md)'s nav bar, 2026-10-20; the
rest of this decision stands.*

Accepted, 2026-10-20, by Tony: "i prefer to lead with the image/movie/action. only the title and
nav at the top. all the legend, controls, explanation, text goes below" and "put the born on date
and the current version and date next to the title". Tony calls the first "a continuous battle":
layouts keep drifting back to text-first.

## Context

The proof-of-principle pages ([ADR-0006](0006-proof-of-principle-pages-are-single-html-files.md))
opened with a banner, an introduction and a prediction prompt, and only then the stage.

## Decision

- **Above the action: one row only.** Back link, the title, forward link. Nothing else.
- **Beside the title: the stamp.** "born ⟨root-commit date⟩ · v⟨version⟩, ⟨that version's date⟩",
  baked from git at build (as `gaba_excites` does), the full times with UTC offset in its tooltip.
- **Then the action**: the stage, and beside it the voltage ruler; then the other live plots.
- **Then controls and readouts**, directly under the visual they drive.
- **Then every piece of text**: the introduction, the prediction prompt, what to notice, the
  math, the clinical notes, the note about the models.

## Consequences

- `scripts/check.mjs` enforces it on every route at desktop and phone width: it fails if the
  first element under the title row holds no canvas, if any introduction, prompt, note or
  details block comes before the first canvas, or if the stamp is missing or malformed.
- The prediction prompts now come after the visual they ask about. A student sees the cell
  first; the prompt asks them to reset and run it with a prediction in mind.
