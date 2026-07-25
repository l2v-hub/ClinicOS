---
id: "component.frontend.frontend.src.mockdata.mock-storia-terapia"
kind: "typescript-constant"
title: "MOCK_STORIA_TERAPIA"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_STORIA_TERAPIA"
    line_start: "740"
    line_end: "774"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/mockData.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-storia-terapia` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-storia-terapia is the canonical typescript-constant named MOCK_STORIA_TERAPIA.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `MOCK_STORIA_TERAPIA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:740-774` — MOCK_STORIA_TERAPIA

## Related Knowledge

- `belongs-to` → `project.frontend`
