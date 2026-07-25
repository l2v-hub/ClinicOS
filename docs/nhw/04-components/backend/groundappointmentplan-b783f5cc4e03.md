---
id: "component.backend.backend.src.ai.actions.appointments.groundappointmentplan"
kind: "typescript-function"
title: "groundAppointmentPlan"
status: "observed"
summary: "Exported function from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "groundAppointmentPlan"
    line_start: "275"
    line_end: "337"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/appointments.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.appointments.groundappointmentplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.groundappointmentplan is the canonical typescript-function named groundAppointmentPlan.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `groundAppointmentPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:275-337` — groundAppointmentPlan

## Related Knowledge

- `belongs-to` → `project.backend`
