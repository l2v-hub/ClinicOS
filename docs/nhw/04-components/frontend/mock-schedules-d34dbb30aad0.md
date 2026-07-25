---
id: "component.frontend.frontend.src.mockdata.mock-schedules"
kind: "typescript-constant"
title: "MOCK_SCHEDULES"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_SCHEDULES"
    line_start: "583"
    line_end: "630"
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

What does `component.frontend.frontend.src.mockdata.mock-schedules` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-schedules is the canonical typescript-constant named MOCK_SCHEDULES.

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

The symbol is exported across its module boundary as `MOCK_SCHEDULES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:583-630` — MOCK_SCHEDULES

## Related Knowledge

- `belongs-to` → `project.frontend`
