---
id: "test.repository.e2e.scale-shots.mjs"
kind: "e2e-test"
title: "scale-shots.mjs"
status: "observed"
summary: "node-test e2e test surface."
bounded_contexts: []
sources:
  - path: "e2e/scale-shots.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/scale-shots.mjs"
    confidence: "observed"
tags:
  - "test"
  - "e2e"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `test.repository.e2e.scale-shots.mjs` represent in ClinicOS?

## Canonical Definition

test.repository.e2e.scale-shots.mjs is the canonical e2e-test named scale-shots.mjs.

## Inputs

Test source: `e2e/scale-shots.mjs`.

## Outputs

Objective pass/fail evidence for the behavior encoded in the test.

## Dependencies

Framework: `node-test`; owning project: `project.clinicos`.

## Side Effects

May create isolated fixtures or exercise local runtime behavior as defined by the test.

## Consumers

CI/CD, quality gates, maintainers, and autonomous QA agents.

## Invariants

A test is evidence only for assertions and execution paths it actually exercises.

## Failure Modes

Assertion failure, fixture failure, unavailable dependency, timeout, or environment mismatch.

## Evidence

- `e2e/scale-shots.mjs`

## Related Knowledge

- `belongs-to` → `project.clinicos`
