---
id: "api.backend.get-admin-rooms-4"
kind: "api-endpoint"
title: "GET /admin/rooms"
status: "observed"
summary: "GET /admin/rooms endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "131"
    line_end: "142"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.room"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.get-admin-rooms-4` represent in ClinicOS?

## Canonical Definition

api.backend.get-admin-rooms-4 is the canonical api-endpoint named GET /admin/rooms.

## Inputs

- Method: `GET`
- Path: `/admin/rooms`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.room.findMany"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:131-142` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.room`
