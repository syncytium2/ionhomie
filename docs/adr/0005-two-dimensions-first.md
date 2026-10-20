# ADR-0005: Two dimensions first

## Status

Accepted, 2026-10-19, by Tony: "2d for now, but i'm open to 3d."

## Context

The physics that matters happens along one axis, across the membrane. A 3D cell adds
occlusion and camera control, and a sphere hides the inside-versus-outside contrast that most
chapters depend on.

## Decision

Every working view is 2D: a slice through the cell, or a box with a membrane across it.

## Consequences

- 3D, if it comes, is a single display-only view (three.js, bundled locally, per the
  no-third-party-requests rule in the stack ADR,
  [ADR-0003](0003-react-like-gaba-excites.md)), never the view a chapter is taught in. Adding
  it is a new ADR.
