---
id: "component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyform"
kind: "typescript-function"
title: "dischargeRowToTherapyForm"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/dischargeTherapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/components/shared/intake/dischargeTherapy.ts"
    symbol: "dischargeRowToTherapyForm"
    line_start: "157"
    line_end: "213"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyform` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.dischargetherapy.dischargerowtotherapyform is the canonical typescript-function named dischargeRowToTherapyForm.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/DischargeTherapyReview.tsx`

## Invariants

The symbol is exported across its module boundary as `dischargeRowToTherapyForm`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/dischargeTherapy.ts:157-213` — dischargeRowToTherapyForm

## Related Knowledge

- `belongs-to` → `project.frontend`
