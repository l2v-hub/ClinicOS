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
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
