---
id: "component.backend.backend.src.ai.actions.appointments.defaultsearchpatients"
kind: "typescript-function"
title: "defaultSearchPatients"
status: "observed"
summary: "Exported function from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "defaultSearchPatients"
    line_start: "223"
    line_end: "238"
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

What does `component.backend.backend.src.ai.actions.appointments.defaultsearchpatients` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.defaultsearchpatients is the canonical typescript-function named defaultSearchPatients.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/consegne.ts`

## Invariants

The symbol is exported across its module boundary as `defaultSearchPatients`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:223-238` — defaultSearchPatients

## Related Knowledge

- `belongs-to` → `project.backend`
