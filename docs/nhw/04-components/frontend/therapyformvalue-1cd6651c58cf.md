---
id: "component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformvalue"
kind: "typescript-interface"
title: "TherapyFormValue"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/cartella/TherapyFormFields.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    symbol: "TherapyFormValue"
    line_start: "20"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/TherapyFormFields.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformvalue` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapyformfields.therapyformvalue is the canonical typescript-interface named TherapyFormValue.

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
- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`
- `frontend/src/components/shared/intake/dischargeTherapy.ts`

## Invariants

The symbol is exported across its module boundary as `TherapyFormValue`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/TherapyFormFields.tsx:20-37` — TherapyFormValue

## Related Knowledge

- `belongs-to` → `project.frontend`
