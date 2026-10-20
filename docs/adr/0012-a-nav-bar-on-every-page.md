# ADR-0012: A nav bar on every page: brand and stamp, then every chapter

## Status

Accepted, 2026-10-20, by Tony: *"also need full nav bar at the top. maybe ionhomie and born on version info
one line, the a row of concepts that persist through the entire site."* Supersedes the single back/title/forward
row of [ADR-0008](0008-lead-with-the-action.md); the rest of ADR-0008 (only title and nav above the action;
everything else below) stands.

## Decision

- First line: **ionhomie** (a link home) and the stamp, "born ⟨date⟩ · v⟨version⟩, ⟨date⟩".
- Second line: **every chapter, on every page**, numbered, the current one marked; Home first. On a phone the
  row scrolls sideways inside the bar, and the current tab is scrolled into view.

## Consequences

- `scripts/check.mjs` fails a page whose nav does not list every chapter or marks none as current.
