---
id: "component.frontend.frontend.src.types.prioritaconsegna"
kind: "typescript-type-alias"
title: "PrioritaConsegna"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "PrioritaConsegna"
    line_start: "134"
    line_end: "134"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.prioritaconsegna` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.prioritaconsegna is the canonical typescript-type-alias named PrioritaConsegna.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `PrioritaConsegna`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:134-134` — PrioritaConsegna

## Related Knowledge

- `belongs-to` → `project.frontend`
