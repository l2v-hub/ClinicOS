---
id: "test.repository.e2e.real-provider.test.mjs"
kind: "e2e-test"
title: "real-provider.test.mjs"
status: "observed"
summary: "node-test e2e test surface."
bounded_contexts: []
sources:
  - path: "e2e/real-provider.test.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/real-provider.test.mjs"
    confidence: "observed"
tags:
  - "test"
  - "e2e"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `test.repository.e2e.real-provider.test.mjs` represent in ClinicOS?

## Canonical Definition

test.repository.e2e.real-provider.test.mjs is the canonical e2e-test named real-provider.test.mjs.

## Inputs

Test source: `e2e/real-provider.test.mjs`.

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

- `e2e/real-provider.test.mjs`

## Related Knowledge

- `belongs-to` → `project.clinicos`
