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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
