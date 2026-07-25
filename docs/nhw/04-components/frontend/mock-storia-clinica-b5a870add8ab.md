---
id: "component.frontend.frontend.src.mockdata.mock-storia-clinica"
kind: "typescript-constant"
title: "MOCK_STORIA_CLINICA"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_STORIA_CLINICA"
    line_start: "697"
    line_end: "738"
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

What does `component.frontend.frontend.src.mockdata.mock-storia-clinica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-storia-clinica is the canonical typescript-constant named MOCK_STORIA_CLINICA.

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

The symbol is exported across its module boundary as `MOCK_STORIA_CLINICA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:697-738` — MOCK_STORIA_CLINICA

## Related Knowledge

- `belongs-to` → `project.frontend`
