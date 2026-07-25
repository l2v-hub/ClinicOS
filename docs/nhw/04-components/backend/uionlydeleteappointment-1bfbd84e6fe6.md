---
id: "component.backend.backend.src.services.appointment-service.uionlydeleteappointment"
kind: "typescript-function"
title: "uiOnlyDeleteAppointment"
status: "observed"
summary: "Exported function from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "uiOnlyDeleteAppointment"
    line_start: "293"
    line_end: "298"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.uionlydeleteappointment` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.uionlydeleteappointment is the canonical typescript-function named uiOnlyDeleteAppointment.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/appointments.ts`
- `backend/src/services/__tests__/appointment-service.test.ts`

## Invariants

The symbol is exported across its module boundary as `uiOnlyDeleteAppointment`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:293-298` — uiOnlyDeleteAppointment

## Related Knowledge

- `belongs-to` → `project.backend`
