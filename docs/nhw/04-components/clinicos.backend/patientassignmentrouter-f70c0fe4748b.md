---
id: "component.backend.backend.src.routes.admin-rooms.patientassignmentrouter"
kind: "typescript-constant"
title: "patientAssignmentRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/admin-rooms.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "patientAssignmentRouter"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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

Owning project: `project.clinicos.backend`.

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

- `belongs-to` → `project.clinicos.backend`
