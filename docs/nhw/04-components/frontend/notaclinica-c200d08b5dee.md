---
id: "component.frontend.frontend.src.types.notaclinica"
kind: "typescript-interface"
title: "NotaClinica"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "NotaClinica"
    line_start: "384"
    line_end: "391"
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

What does `component.frontend.frontend.src.types.notaclinica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.notaclinica is the canonical typescript-interface named NotaClinica.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `NotaClinica`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:384-391` — NotaClinica

## Related Knowledge

- `belongs-to` → `project.frontend`
