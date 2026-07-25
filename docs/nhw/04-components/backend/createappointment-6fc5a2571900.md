---
id: "component.backend.backend.src.services.appointment-service.createappointment"
kind: "typescript-function"
title: "createAppointment"
status: "observed"
summary: "Exported function from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "createAppointment"
    line_start: "222"
    line_end: "245"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.createappointment` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.createappointment is the canonical typescript-function named createAppointment.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/write-services.ts`
- `backend/src/routes/appointments.ts`
- `backend/src/services/__tests__/appointment-service.test.ts`

## Invariants

The symbol is exported across its module boundary as `createAppointment`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:222-245` — createAppointment

## Related Knowledge

- `belongs-to` → `project.backend`
