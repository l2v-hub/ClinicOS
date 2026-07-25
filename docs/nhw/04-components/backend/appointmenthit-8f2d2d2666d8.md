---
id: "component.backend.backend.src.ai.actions.appointments.appointmenthit"
kind: "typescript-interface"
title: "AppointmentHit"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "AppointmentHit"
    line_start: "200"
    line_end: "203"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.appointments.appointmenthit` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.appointmenthit is the canonical typescript-interface named AppointmentHit.

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

The symbol is exported across its module boundary as `AppointmentHit`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:200-203` — AppointmentHit

## Related Knowledge

- `belongs-to` → `project.backend`
