---
id: "component.frontend.frontend.src.components.shared.appointmentform.appointmentform"
kind: "typescript-react-component"
title: "AppointmentForm"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/AppointmentForm.tsx."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "frontend/src/components/shared/AppointmentForm.tsx"
    symbol: "AppointmentForm"
    line_start: "34"
    line_end: "312"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/AppointmentForm.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.appointmentform.appointmentform` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.appointmentform.appointmentform is the canonical typescript-react-component named AppointmentForm.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminAgenda.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`

## Invariants

The symbol is exported across its module boundary as `AppointmentForm`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AppointmentForm.tsx:34-312` — AppointmentForm

## Related Knowledge

- `belongs-to` → `project.frontend`
