---
id: "component.e2e.e2e.fixtures.fixtures"
kind: "typescript-constant"
title: "FIXTURES"
status: "observed"
summary: "Exported constant from e2e/fixtures.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "e2e/fixtures.mjs"
    symbol: "FIXTURES"
    line_start: "7"
    line_end: "26"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/fixtures.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.e2e.e2e.fixtures.fixtures` represent in ClinicOS?

## Canonical Definition

component.e2e.e2e.fixtures.fixtures is the canonical typescript-constant named FIXTURES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

- `e2e/import-e2e.mjs`

## Invariants

The symbol is exported across its module boundary as `FIXTURES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `e2e/fixtures.mjs:7-26` — FIXTURES

## Related Knowledge

- `belongs-to` → `project.clinicos`
