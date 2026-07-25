---
id: "api.backend.post-admin-rooms-by-param-beds-10"
kind: "api-endpoint"
title: "POST /admin/rooms/:roomId/beds"
status: "observed"
summary: "POST /admin/rooms/:roomId/beds endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "359"
    line_end: "405"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.bed"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.room"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.post-admin-rooms-by-param-beds-10` represent in ClinicOS?

## Canonical Definition

api.backend.post-admin-rooms-by-param-beds-10 is the canonical api-endpoint named POST /admin/rooms/:roomId/beds.

## Inputs

- Method: `POST`
- Path: `/admin/rooms/:roomId/beds`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.create","prisma.room.findUnique"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:359-405` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.bed`
- `writes` → `data.model.room`
