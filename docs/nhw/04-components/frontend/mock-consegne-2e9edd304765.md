---
id: "component.frontend.frontend.src.mockdata.mock-consegne"
kind: "typescript-constant"
title: "MOCK_CONSEGNE"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_CONSEGNE"
    line_start: "186"
    line_end: "285"
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

What does `component.frontend.frontend.src.mockdata.mock-consegne` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-consegne is the canonical typescript-constant named MOCK_CONSEGNE.

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

The symbol is exported across its module boundary as `MOCK_CONSEGNE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:186-285` — MOCK_CONSEGNE

## Related Knowledge

- `belongs-to` → `project.frontend`
