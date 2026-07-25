---
id: "component.frontend.frontend.src.lib.codicefiscale.computecf"
kind: "typescript-function"
title: "computeCF"
status: "observed"
summary: "Exported function from frontend/src/lib/codiceFiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/codiceFiscale.ts"
    symbol: "computeCF"
    line_start: "34"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/codiceFiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.codicefiscale.computecf` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.codicefiscale.computecf is the canonical typescript-function named computeCF.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/components/shared/intake/StepAnagrafica.tsx`

## Invariants

The symbol is exported across its module boundary as `computeCF`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/codiceFiscale.ts:34-68` — computeCF

## Related Knowledge

- `belongs-to` → `project.frontend`
