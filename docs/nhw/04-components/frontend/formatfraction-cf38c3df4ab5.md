---
id: "component.frontend.frontend.src.components.operator.cartella.therapydose.formatfraction"
kind: "typescript-function"
title: "formatFraction"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/therapyDose.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/therapyDose.ts"
    symbol: "formatFraction"
    line_start: "67"
    line_end: "71"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/therapyDose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.formatfraction` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.formatfraction is the canonical typescript-function named formatFraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/InvioPSModal.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/components/operator/cartella/TherapyFormFields.tsx`
- `frontend/src/components/shared/intake/dischargeTherapy.ts`

## Invariants

The symbol is exported across its module boundary as `formatFraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:67-71` — formatFraction

## Related Knowledge

- `belongs-to` → `project.frontend`
