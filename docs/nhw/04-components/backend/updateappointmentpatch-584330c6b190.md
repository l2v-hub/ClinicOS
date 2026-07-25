---
id: 'component.backend.backend.src.services.appointment-service.updateappointmentpatch'
kind: 'typescript-interface'
title: 'UpdateAppointmentPatch'
status: 'observed'
summary: 'Exported interface from backend/src/services/appointment-service.ts.'
bounded_contexts:
  - 'context.scheduling'
sources:
  - path: 'backend/src/services/appointment-service.ts'
    symbol: 'UpdateAppointmentPatch'
    line_start: '52'
    line_end: '60'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/services/appointment-service.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.updateappointmentpatch` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.updateappointmentpatch is the canonical typescript-interface named UpdateAppointmentPatch.

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

The symbol is exported across its module boundary as `UpdateAppointmentPatch`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:52-60` — UpdateAppointmentPatch

## Related Knowledge

- `belongs-to` → `project.backend`
