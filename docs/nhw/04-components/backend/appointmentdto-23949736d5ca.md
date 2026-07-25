---
id: "component.backend.backend.src.services.appointment-service.appointmentdto"
kind: "typescript-interface"
title: "AppointmentDTO"
status: "observed"
summary: "Exported interface from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "AppointmentDTO"
    line_start: "25"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.appointmentdto` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.appointmentdto is the canonical typescript-interface named AppointmentDTO.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AppointmentDTO`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:25-37` — AppointmentDTO

## Related Knowledge

- `belongs-to` → `project.backend`
