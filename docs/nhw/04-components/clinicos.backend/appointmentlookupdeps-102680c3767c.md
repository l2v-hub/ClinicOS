---
id: "component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps"
kind: "typescript-interface"
title: "AppointmentLookupDeps"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentLookupDeps"
    line_start: "205"
    line_end: "220"
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

What does `component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.appointmentlookupdeps is the canonical typescript-interface named AppointmentLookupDeps.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `AppointmentLookupDeps`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:205-220` — AppointmentLookupDeps

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
