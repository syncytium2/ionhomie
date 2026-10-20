#!/usr/bin/env bash
# Everything a change must pass before it is committed: types, the physics tests, a clean build,
# and every route driven in a real browser (scripts/check.mjs). Then look at screenshots/.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
npx tsc -b
npx vitest run 2>&1 | tail -3
rm -rf dist && npx vite build 2>&1 | tail -2
node scripts/check.mjs
