---
id: "component.frontend.frontend.src.types.therapyscheduleapi"
kind: "typescript-interface"
title: "TherapyScheduleAPI"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TherapyScheduleAPI"
    line_start: "976"
    line_end: "986"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.therapyscheduleapi` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.therapyscheduleapi is the canonical typescript-interface named TherapyScheduleAPI.

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

The symbol is exported across its module boundary as `TherapyScheduleAPI`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:976-986` — TherapyScheduleAPI

## Related Knowledge

- `belongs-to` → `project.frontend`
