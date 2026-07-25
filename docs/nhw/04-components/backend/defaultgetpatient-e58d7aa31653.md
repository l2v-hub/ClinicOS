---
id: "component.backend.backend.src.ai.actions.appointments.defaultgetpatient"
kind: "typescript-function"
title: "defaultGetPatient"
status: "observed"
summary: "Exported function from backend/src/ai/actions/appointments.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/actions/appointments.ts"
    symbol: "defaultGetPatient"
    line_start: "240"
    line_end: "246"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.appointments.defaultgetpatient` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.appointments.defaultgetpatient is the canonical typescript-function named defaultGetPatient.

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

The symbol is exported across its module boundary as `defaultGetPatient`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/appointments.ts:240-246` — defaultGetPatient

## Related Knowledge

- `belongs-to` → `project.backend`
