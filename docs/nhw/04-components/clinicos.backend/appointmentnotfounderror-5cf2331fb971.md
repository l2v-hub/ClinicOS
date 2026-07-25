---
id: "component.backend.backend.src.services.appointment-service.appointmentnotfounderror"
kind: "typescript-class"
title: "AppointmentNotFoundError"
status: "observed"
summary: "Exported class from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "AppointmentNotFoundError"
    line_start: "17"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.appointmentnotfounderror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.appointmentnotfounderror is the canonical typescript-class named AppointmentNotFoundError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/appointments.ts`
- `backend/src/services/__tests__/appointment-service.test.ts`

## Invariants

The symbol is exported across its module boundary as `AppointmentNotFoundError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:17-22` — AppointmentNotFoundError

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
