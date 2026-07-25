---
id: "test.repository.scripts.nhw.test.python-extractor.test.mjs"
kind: "unit-test"
title: "python-extractor.test.mjs"
status: "observed"
summary: "node-test unit test surface."
bounded_contexts: []
sources:
  - path: "scripts/nhw/test/python-extractor.test.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/test/python-extractor.test.mjs"
    confidence: "observed"
tags:
  - "test"
  - "unit"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `test.repository.scripts.nhw.test.python-extractor.test.mjs` represent in ClinicOS?

## Canonical Definition

test.repository.scripts.nhw.test.python-extractor.test.mjs is the canonical unit-test named python-extractor.test.mjs.

## Inputs

Test source: `scripts/nhw/test/python-extractor.test.mjs`.

## Outputs

Objective pass/fail evidence for the behavior encoded in the test.

## Dependencies

Framework: `node-test`; owning project: `project.repository-automation`.

## Side Effects

May create isolated fixtures or exercise local runtime behavior as defined by the test.

## Consumers

CI/CD, quality gates, maintainers, and autonomous QA agents.

## Invariants

A test is evidence only for assertions and execution paths it actually exercises.

## Failure Modes

Assertion failure, fixture failure, unavailable dependency, timeout, or environment mismatch.

## Evidence

- `scripts/nhw/test/python-extractor.test.mjs`

## Related Knowledge

- `belongs-to` → `project.repository-automation`
