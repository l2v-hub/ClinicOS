---
id: "test.repository.e2e.remediation.pw.config.244.ts"
kind: "e2e-test"
title: "pw.config.244.ts"
status: "observed"
summary: "node-test e2e test surface."
bounded_contexts: []
sources:
  - path: "e2e/remediation/pw.config.244.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/remediation/pw.config.244.ts"
    confidence: "observed"
tags:
  - "test"
  - "e2e"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `test.repository.e2e.remediation.pw.config.244.ts` represent in ClinicOS?

## Canonical Definition

test.repository.e2e.remediation.pw.config.244.ts is the canonical e2e-test named pw.config.244.ts.

## Inputs

Test source: `e2e/remediation/pw.config.244.ts`.

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

- `e2e/remediation/pw.config.244.ts`

## Related Knowledge

- `belongs-to` → `project.clinicos`
