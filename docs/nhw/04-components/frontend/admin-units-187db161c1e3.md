---
id: "component.frontend.frontend.src.components.operator.cartella.therapydose.admin-units"
kind: "typescript-constant"
title: "ADMIN_UNITS"
status: "observed"
summary: "Exported constant from frontend/src/components/operator/cartella/therapyDose.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/therapyDose.ts"
    symbol: "ADMIN_UNITS"
    line_start: "21"
    line_end: "30"
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

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.admin-units` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.admin-units is the canonical typescript-constant named ADMIN_UNITS.

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
- `frontend/src/components/operator/cartella/TherapyFormFields.tsx`
- `frontend/src/components/shared/intake/dischargeTherapy.ts`

## Invariants

The symbol is exported across its module boundary as `ADMIN_UNITS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:21-30` — ADMIN_UNITS

## Related Knowledge

- `belongs-to` → `project.frontend`
