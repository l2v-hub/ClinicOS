---
id: "component.frontend.frontend.src.components.operator.cartella.therapyformfields.emptytherapyform"
kind: "typescript-function"
title: "emptyTherapyForm"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/TherapyFormFields.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    symbol: "emptyTherapyForm"
    line_start: "56"
    line_end: "82"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapyformfields.emptytherapyform` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapyformfields.emptytherapyform is the canonical typescript-function named emptyTherapyForm.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/components/operator/sections/TherapyEditor.tsx`
- `frontend/src/components/shared/intake/dischargeTherapy.ts`

## Invariants

The symbol is exported across its module boundary as `emptyTherapyForm`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/TherapyFormFields.tsx:56-82` — emptyTherapyForm

## Related Knowledge

- `belongs-to` → `project.frontend`
