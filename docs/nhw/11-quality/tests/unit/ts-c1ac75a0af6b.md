---
id: "test.repository.frontend.src.components.operator.cartella.tests.esamisort.test.ts"
kind: "unit-test"
title: "esamiSort.test.ts"
status: "observed"
summary: "node-test unit test surface."
bounded_contexts: []
sources:
  - path: "frontend/src/components/operator/cartella/__tests__/esamiSort.test.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/__tests__/esamiSort.test.ts"
    confidence: "observed"
tags:
  - "test"
  - "unit"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `test.repository.frontend.src.components.operator.cartella.tests.esamisort.test.ts` represent in ClinicOS?

## Canonical Definition

test.repository.frontend.src.components.operator.cartella.tests.esamisort.test.ts is the canonical unit-test named esamiSort.test.ts.

## Inputs

Test source: `frontend/src/components/operator/cartella/__tests__/esamiSort.test.ts`.

## Outputs

Objective pass/fail evidence for the behavior encoded in the test.

## Dependencies

Framework: `node-test`; owning project: `project.frontend`.

## Side Effects

May create isolated fixtures or exercise local runtime behavior as defined by the test.

## Consumers

CI/CD, quality gates, maintainers, and autonomous QA agents.

## Invariants

A test is evidence only for assertions and execution paths it actually exercises.

## Failure Modes

Assertion failure, fixture failure, unavailable dependency, timeout, or environment mismatch.

## Evidence

- `frontend/src/components/operator/cartella/__tests__/esamiSort.test.ts`

## Related Knowledge

- `belongs-to` → `project.frontend`
