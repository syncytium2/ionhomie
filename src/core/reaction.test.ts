// Every number the step-through's reaction box quotes, pinned (docs/adr/0027).
import { test } from "vitest";
import assert from "node:assert/strict";
import * as R from "./reaction.ts";

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (±${tol})`);
const settle = (b: R.Box) => { R.relax(b, 1e6, 1); return b; };

test("At rest the box sits at pH 7.40, both directions running at 0.156 mM/s", () => {
  const b = R.rest(false), r = R.rates(b, 1);
  close(R.pH(b), 7.401, 0.001);
  close(r.f, 0.156, 1e-9); close(r.b, 0.156, 1e-9, "backward equals forward");
  close(R.pH(R.rest(true)), 7.401, 0.001, "the buffer does not move the resting pH");
});

test("Unbuffered, adding 1 mM CO₂ converts only 33 nM, and pH falls from 7.40 to 7.14", () => {
  const b = R.rest(false); b.co2 += 1;
  close(R.toEq(b) * 1e6, 33.1, 0.1, "nM converted");
  close(R.pH(settle(b)), 7.138, 0.001);
});

test("Buffered, the same 1 mM converts 0.75 mM, and pH falls only to 7.33", () => {
  const b = R.rest(true); b.co2 += 1;
  close(R.toEq(b), 0.750, 0.001, "mM converted");
  close(R.pH(settle(b)), 7.332, 0.001);
});

test("Buffered, without the enzyme it takes seconds (τ ≈ 5.8 s); with it, one frame", () => {
  const b = R.rest(true); b.co2 += 1;
  const x = R.toEq(b), slow = { ...b };
  let t = 0, done = 0;
  while (done < x * (1 - Math.exp(-1))) { done += R.relax(slow, 0.01, 1); t += 0.01; }
  close(t, 5.75, 0.05, "τ, s");
  const fast = { ...b };
  close(R.relax(fast, 1 / 60, R.CA_CELL) / x, 1, 1e-6, "converted in one 60 Hz frame");
});

test("Unbuffered, 1 mM of acid almost all runs back to CO₂: bicarbonate is the buffer", () => {
  const b = R.rest(false); b.acid += 1;
  close(R.toEq(b), -0.99996, 0.00001);
  close(R.pH(settle(b)), 7.119, 0.001);
});

test("The enzyme changes how fast, never where it ends", () => {
  const a = R.rest(true), c = R.rest(true); a.co2 += 1; c.co2 += 1;
  R.relax(a, 1e6, 1); R.relax(c, 1e6, R.CA_CELL);
  close(a.hco3, c.hco3, 1e-9); close(R.pH(a), R.pH(c), 1e-9);
});
