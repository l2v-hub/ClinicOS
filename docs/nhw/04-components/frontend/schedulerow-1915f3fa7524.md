---
id: "component.frontend.frontend.src.components.operator.cartella.therapydose.schedulerow"
kind: "typescript-interface"
title: "ScheduleRow"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/cartella/therapyDose.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/therapyDose.ts"
    symbol: "ScheduleRow"
    line_start: "4"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/therapyDose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.schedulerow` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.schedulerow is the canonical typescript-interface named ScheduleRow.

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

## Invariants

The symbol is exported across its module boundary as `ScheduleRow`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:4-9` — ScheduleRow

## Related Knowledge

- `belongs-to` → `project.frontend`
