---
id: 'component.backend.backend.src.routes.admin-rooms.patientassignmentrouter'
kind: 'typescript-constant'
title: 'patientAssignmentRouter'
status: 'observed'
summary: 'Exported constant from backend/src/routes/admin-rooms.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'patientAssignmentRouter'
    line_start: '5'
    line_end: '5'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.routes.admin-rooms.patientassignmentrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.admin-rooms.patientassignmentrouter is the canonical typescript-constant named patientAssignmentRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `patientAssignmentRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:5-5` — patientAssignmentRouter

## Related Knowledge

- `belongs-to` → `project.backend`
