---
id: 'component.e2e.e2e.req027-sections-fixture.sections-fixture'
kind: 'typescript-constant'
title: 'SECTIONS_FIXTURE'
status: 'observed'
summary: 'Exported constant from e2e/req027-sections-fixture.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'e2e/req027-sections-fixture.mjs'
    symbol: 'SECTIONS_FIXTURE'
    line_start: '32'
    line_end: '206'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.clinicos'
    evidence: 'e2e/req027-sections-fixture.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
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
