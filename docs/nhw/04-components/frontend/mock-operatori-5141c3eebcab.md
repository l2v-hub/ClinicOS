---
id: "component.frontend.frontend.src.mockdata.mock-operatori"
kind: "typescript-constant"
title: "MOCK_OPERATORI"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_OPERATORI"
    line_start: "110"
    line_end: "182"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-operatori` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-operatori is the canonical typescript-constant named MOCK_OPERATORI.

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

The symbol is exported across its module boundary as `MOCK_OPERATORI`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:110-182` — MOCK_OPERATORI

## Related Knowledge

- `belongs-to` → `project.frontend`
