---
id: "component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformfields"
kind: "typescript-react-component"
title: "TherapyFormFields"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/TherapyFormFields.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    symbol: "TherapyFormFields"
    line_start: "92"
    line_end: "515"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformfields` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformfields is the canonical typescript-react-component named TherapyFormFields.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/components/operator/sections/TherapyEditor.tsx`
- `frontend/src/components/shared/intake/DischargeTherapyReview.tsx`

## Invariants

The symbol is exported across its module boundary as `TherapyFormFields`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/TherapyFormFields.tsx:92-515` — TherapyFormFields

## Related Knowledge

- `belongs-to` → `project.frontend`
