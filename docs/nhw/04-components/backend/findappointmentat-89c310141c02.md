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
    target: "project.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
