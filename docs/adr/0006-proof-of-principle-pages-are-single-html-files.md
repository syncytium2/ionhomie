# ADR-0006: The proof-of-principle pages are single HTML files that refuse every request

## Status

*Superseded as the product by [ADR-0010](0010-the-app-is-react-on-the-ported-core.md), 2026-10-20; the pages
are kept, still checked, in `prototype/`.*

Accepted, 2026-10-19. Tony asked for them: "once the foundations are laid, i think you have
enough to create some html pages as a demo and proof of principle." Their form is Claude's,
borrowed from `ml2dl`'s single-file pages (its ADR-0004), and Tony has not ruled on it.

## Context

The app proper is React with a worker ([ADR-0003](0003-react-like-gaba-excites.md)). Before
that is built, the chapters, the shared views and the physics need to be seen working, so the
arc ([ADR-0001](0001-the-arc-runs-ghk-then-rundown-then-pumps.md)) and the particles-depict
decision ([ADR-0004](0004-the-physics-computes-the-particles-depict.md)) can be judged on
something real.

## Decision

- **One self-contained HTML file per chapter**, in `prototype/site/`, plain JavaScript and Canvas2D, no
  libraries. Each opens straight from disk.
- **Sources live in `prototype/demo/`**: the physics in `demo/physics.js`, the shared views in
  `demo/views.js`, the running pump–leak cell in `demo/lab.js` (rundown, pumps and chloride
  pages only), the styles in `demo/style.css`, one template per page in `demo/pages/`.
  `python3 tools/build_demo.py` inlines them into `site/` and writes each page's
  Content-Security-Policy.
- **The policy is `default-src 'none'`**, with scripts and the style sheet allowed only by their
  SHA-256 hashes, so the browser refuses every request.
- **`demo/physics.js` is tested in Node** (`node --test tests/*.test.js`): every number a page
  quotes is pinned there. `tests/site.test.js` holds the built pages to the policy and to their
  links, and `node tools/check_pages.mjs` opens every page in Chromium at desktop and phone width,
  drives it, and fails on a console error, a policy violation, a request, or overflow.
- **Each page opens with one row**: back, its title, forward; and a banner saying it is a proof
  of principle, not the app.

## Consequences

- The physics is written in plain JavaScript here and will be ported to the TypeScript core.
  The Node tests travel with it and are the check that the port computes the same numbers.
- These pages are throwaway in form, not in physics: the models and their tests are meant to
  survive.
