---
id: "component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyinput"
kind: "typescript-function"
title: "dischargeRowToTherapyInput"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/dischargeTherapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/components/shared/intake/dischargeTherapy.ts"
    symbol: "dischargeRowToTherapyInput"
    line_start: "55"
    line_end: "88"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/dischargeTherapy.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyinput` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyinput is the canonical typescript-function named dischargeRowToTherapyInput.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`

## Invariants

The symbol is exported across its module boundary as `dischargeRowToTherapyInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/dischargeTherapy.ts:55-88` — dischargeRowToTherapyInput

## Related Knowledge

- `belongs-to` → `project.frontend`
