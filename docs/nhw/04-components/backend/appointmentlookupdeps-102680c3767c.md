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
    target: "project.backend"
    evidence: "backend/src/ai/actions/appointments.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
