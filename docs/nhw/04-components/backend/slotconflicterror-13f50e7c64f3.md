---
id: "component.backend.backend.src.services.appointment-service.slotconflicterror"
kind: "typescript-class"
title: "SlotConflictError"
status: "observed"
summary: "Exported class from backend/src/services/appointment-service.ts."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/services/appointment-service.ts"
    symbol: "SlotConflictError"
    line_start: "11"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/appointment-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.services.appointment-service.slotconflicterror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.appointment-service.slotconflicterror is the canonical typescript-class named SlotConflictError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/appointments.ts`
- `backend/src/services/__tests__/appointment-service.test.ts`

## Invariants

The symbol is exported across its module boundary as `SlotConflictError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/appointment-service.ts:11-16` — SlotConflictError

## Related Knowledge

- `belongs-to` → `project.backend`
