---
id: "component.frontend.frontend.src.components.operator.cartella.therapydose.divisible-units"
kind: "typescript-constant"
title: "DIVISIBLE_UNITS"
status: "observed"
summary: "Exported constant from frontend/src/components/operator/cartella/therapyDose.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/therapyDose.ts"
    symbol: "DIVISIBLE_UNITS"
    line_start: "31"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/therapyDose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.divisible-units` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.divisible-units is the canonical typescript-constant named DIVISIBLE_UNITS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/TherapyFormFields.tsx`

## Invariants

The symbol is exported across its module boundary as `DIVISIBLE_UNITS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:31-31` — DIVISIBLE_UNITS

## Related Knowledge

- `belongs-to` → `project.frontend`
