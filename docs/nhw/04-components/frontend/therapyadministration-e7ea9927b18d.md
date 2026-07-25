---
id: "component.frontend.frontend.src.types.therapyadministration"
kind: "typescript-interface"
title: "TherapyAdministration"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TherapyAdministration"
    line_start: "934"
    line_end: "946"
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

What does `component.frontend.frontend.src.types.therapyadministration` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.therapyadministration is the canonical typescript-interface named TherapyAdministration.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/operator/TherapySlotModal.tsx`

## Invariants

The symbol is exported across its module boundary as `TherapyAdministration`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:934-946` — TherapyAdministration

## Related Knowledge

- `belongs-to` → `project.frontend`
