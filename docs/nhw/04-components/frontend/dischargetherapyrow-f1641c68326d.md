---
id: "component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargetherapyrow"
kind: "typescript-interface"
title: "DischargeTherapyRow"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/intake/dischargeTherapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/components/shared/intake/dischargeTherapy.ts"
    symbol: "DischargeTherapyRow"
    line_start: "13"
    line_end: "26"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/dischargeTherapy.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargetherapyrow` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargetherapyrow is the canonical typescript-interface named DischargeTherapyRow.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/DischargeTherapyReview.tsx`
- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`
- `frontend/src/components/shared/intake/StepClinica.tsx`

## Invariants

The symbol is exported across its module boundary as `DischargeTherapyRow`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/dischargeTherapy.ts:13-26` — DischargeTherapyRow

## Related Knowledge

- `belongs-to` → `project.frontend`
