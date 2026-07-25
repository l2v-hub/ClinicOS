---
id: "component.frontend.frontend.src.types.giorno-label"
kind: "typescript-constant"
title: "GIORNO_LABEL"
status: "observed"
summary: "Exported constant from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "GIORNO_LABEL"
    line_start: "227"
    line_end: "235"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.giorno-label` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.giorno-label is the canonical typescript-constant named GIORNO_LABEL.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/OperatorSchedule.tsx`

## Invariants

The symbol is exported across its module boundary as `GIORNO_LABEL`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:227-235` — GIORNO_LABEL

## Related Knowledge

- `belongs-to` → `project.frontend`
