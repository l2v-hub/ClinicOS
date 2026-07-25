---
id: "component.backend.backend.src.services.appointment-service.findappointmentat"
kind: "typescript-function"
title: "findAppointmentAt"
status: "observed"
summary: "Exported function from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "findAppointmentAt"
    line_start: "208"
    line_end: "218"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.findappointmentat` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.findappointmentat is the canonical typescript-function named findAppointmentAt.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/services/__tests__/appointment-service.test.ts`

## Invariants

The symbol is exported across its module boundary as `findAppointmentAt`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:208-218` — findAppointmentAt

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
