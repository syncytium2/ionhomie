# Notes for agent sessions

Nothing important is kept in this file. Read these at the start of a session, in this order:

1. [`docs/FOUNDATIONS.md`](docs/FOUNDATIONS.md) and [`docs/GLOSSARY.md`](docs/GLOSSARY.md):
   what the project is, what its words mean, and what must not be inferred.
2. [`docs/MILESTONES.md`](docs/MILESTONES.md): what is established, and what is open and
   waiting on whom.
3. [`docs/adr/`](docs/adr/README.md): the decisions. A decision made in conversation is not
   recorded until it has an ADR.

Commands: `npm run dev`; `npm test` (the physics); `npm run check` (types, tests, a clean build,
then every route driven in Chromium; look at `screenshots/` afterwards); `npm run deploy` (only
with Tony's go-ahead); `bash scripts/darkroom.sh` (screenshots to the darkroom, named by the estate
scheme; never copy files there by hand). The prototype in `prototype/` has its own checks and is not imported.

Every page leads with the action ([ADR-0008](docs/adr/0008-lead-with-the-action.md)); the check
enforces it, so a failing layout check is a real failure, not noise.
