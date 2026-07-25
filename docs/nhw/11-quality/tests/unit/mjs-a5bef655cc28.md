---
id: "test.repository.agent-team.tests.unit.github.test.mjs"
kind: "unit-test"
title: "github.test.mjs"
status: "observed"
summary: "node-test unit test surface."
bounded_contexts: []
sources:
  - path: "agent-team/tests/unit/github.test.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/tests/unit/github.test.mjs"
    confidence: "observed"
tags:
  - "test"
  - "unit"
  - "node-test"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `test.repository.agent-team.tests.unit.github.test.mjs` represent in ClinicOS?

## Canonical Definition

test.repository.agent-team.tests.unit.github.test.mjs is the canonical unit-test named github.test.mjs.

## Inputs

Test source: `agent-team/tests/unit/github.test.mjs`.

## Outputs

Objective pass/fail evidence for the behavior encoded in the test.

## Dependencies

Framework: `node-test`; owning project: `project.agent-team`.

## Side Effects

May create isolated fixtures or exercise local runtime behavior as defined by the test.

## Consumers

CI/CD, quality gates, maintainers, and autonomous QA agents.

## Invariants

A test is evidence only for assertions and execution paths it actually exercises.

## Failure Modes

Assertion failure, fixture failure, unavailable dependency, timeout, or environment mismatch.

## Evidence

- `agent-team/tests/unit/github.test.mjs`

## Related Knowledge

- `belongs-to` → `project.agent-team`
