---
id: "component.e2e.e2e.req027-sections-fixture.sections-fixture"
kind: "typescript-constant"
title: "SECTIONS_FIXTURE"
status: "observed"
summary: "Exported constant from e2e/req027-sections-fixture.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "e2e/req027-sections-fixture.mjs"
    symbol: "SECTIONS_FIXTURE"
    line_start: "32"
    line_end: "206"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/req027-sections-fixture.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.e2e.e2e.req027-sections-fixture.sections-fixture` represent in ClinicOS?

## Canonical Definition

component.e2e.e2e.req027-sections-fixture.sections-fixture is the canonical typescript-constant named SECTIONS_FIXTURE.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

- `e2e/req027-sections-shots.mjs`
- `e2e/req032-workspace-shots.mjs`

## Invariants

The symbol is exported across its module boundary as `SECTIONS_FIXTURE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `e2e/req027-sections-fixture.mjs:32-206` — SECTIONS_FIXTURE

## Related Knowledge

- `belongs-to` → `project.clinicos`
