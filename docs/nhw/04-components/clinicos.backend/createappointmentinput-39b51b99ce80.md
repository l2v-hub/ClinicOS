---
id: "component.backend.backend.src.services.appointment-service.createappointmentinput"
kind: "typescript-interface"
title: "CreateAppointmentInput"
status: "observed"
summary: "Exported interface from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "CreateAppointmentInput"
    line_start: "39"
    line_end: "50"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.createappointmentinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.createappointmentinput is the canonical typescript-interface named CreateAppointmentInput.

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

The symbol is exported across its module boundary as `CreateAppointmentInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:39-50` — CreateAppointmentInput

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
