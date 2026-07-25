---
id: "component.backend.backend.src.ai.actions.appointments.appointmentplancontext"
kind: "typescript-interface"
title: "AppointmentPlanContext"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentPlanContext"
    line_start: "104"
    line_end: "106"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/appointments.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.appointments.appointmentplancontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.appointmentplancontext is the canonical typescript-interface named AppointmentPlanContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AppointmentPlanContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:104-106` — AppointmentPlanContext

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
