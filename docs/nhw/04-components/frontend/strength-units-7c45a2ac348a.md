---
id: "component.frontend.frontend.src.components.operator.cartella.therapydose.strength-units"
kind: "typescript-constant"
title: "STRENGTH_UNITS"
status: "observed"
summary: "Exported constant from frontend/src/components/operator/cartella/therapyDose.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/therapyDose.ts"
    symbol: "STRENGTH_UNITS"
    line_start: "44"
    line_end: "44"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.strength-units` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.strength-units is the canonical typescript-constant named STRENGTH_UNITS.

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

The symbol is exported across its module boundary as `STRENGTH_UNITS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:44-44` — STRENGTH_UNITS

## Related Knowledge

- `belongs-to` → `project.frontend`
