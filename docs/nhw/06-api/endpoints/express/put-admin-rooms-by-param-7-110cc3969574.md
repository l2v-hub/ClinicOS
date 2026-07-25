---
id: "api.backend.put-admin-rooms-by-param-7"
kind: "api-endpoint"
title: "PUT /admin/rooms/:roomId"
status: "observed"
summary: "PUT /admin/rooms/:roomId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "224"
    line_end: "290"
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
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.put-admin-rooms-by-param-7` represent in ClinicOS?

## Canonical Definition

api.backend.put-admin-rooms-by-param-7 is the canonical api-endpoint named PUT /admin/rooms/:roomId.

## Inputs

- Method: `PUT`
- Path: `/admin/rooms/:roomId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.deleteMany","prisma.room.findUnique","prisma.room.update"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:224-290` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.bed`
- `writes` → `data.model.room`
