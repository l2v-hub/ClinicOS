---
id: "component.backend.backend.src.routes.admin-rooms.adminrouter"
kind: "typescript-constant"
title: "adminRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/admin-rooms.ts."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "4"
    line_end: "4"
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

What does `component.backend.backend.src.routes.admin-rooms.adminrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.admin-rooms.adminrouter is the canonical typescript-constant named adminRouter.

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

The symbol is exported across its module boundary as `adminRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:4-4` — adminRouter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
