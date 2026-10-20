# ADR-0002: The learners are graduate and medical students

## Status

Accepted, 2026-10-19, by Tony (chosen from: graduate/medical students; undergraduate
physiology; both, layered).

## Context

The level sets how much the tool derives, how many equations it shows, and whether it quotes
real parameters or round ones. A tool written for two levels writes every chapter twice.

## Decision

The primary learner is a graduate or medical student: comfortable with calculus and general
chemistry, meeting membrane biophysics properly for the first time or relearning it.

## Consequences

- The Nernst equation is derived from zero net flux in the drift chapter, not handed over.
  GHK is shown in full, both the voltage equation and the flux equation it comes from.
- Parameters are real, cited and in real units (mM, mV, µm, pF), with each sourced number
  recorded in `lit/sources.json` as in `gaba_excites`.
- The rundown and pump chapters carry clinical cases (ischemia, digoxin/ouabain,
  hyperkalemia), because medical students are the audience that most needs them.
- An undergraduate mode is out of scope. If one is wanted later, it is a new ADR.
