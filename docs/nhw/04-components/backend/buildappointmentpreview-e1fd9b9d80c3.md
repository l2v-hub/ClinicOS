---
id: "component.backend.backend.src.ai.actions.appointments.buildappointmentpreview"
kind: "typescript-function"
title: "buildAppointmentPreview"
status: "observed"
summary: "Exported function from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "buildAppointmentPreview"
    line_start: "340"
    line_end: "368"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.appointments.buildappointmentpreview` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.buildappointmentpreview is the canonical typescript-function named buildAppointmentPreview.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `buildAppointmentPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:340-368` — buildAppointmentPreview

## Related Knowledge

- `belongs-to` → `project.backend`
