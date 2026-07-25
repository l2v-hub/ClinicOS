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
    target: "project.backend"
    evidence: "backend/src/ai/actions/appointments.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
