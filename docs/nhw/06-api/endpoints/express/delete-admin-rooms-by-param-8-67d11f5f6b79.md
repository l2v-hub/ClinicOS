---
id: "api.backend.delete-admin-rooms-by-param-8"
kind: "api-endpoint"
title: "DELETE /admin/rooms/:roomId"
status: "observed"
summary: "DELETE /admin/rooms/:roomId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "293"
    line_end: "325"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.room"
    evidence: "backend/src/routes/admin-rooms.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "delete"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.delete-admin-rooms-by-param-8` represent in ClinicOS?

## Canonical Definition

api.backend.delete-admin-rooms-by-param-8 is the canonical api-endpoint named DELETE /admin/rooms/:roomId.

## Inputs

- Method: `DELETE`
- Path: `/admin/rooms/:roomId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.room.delete","prisma.room.findUnique"]`
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

- `backend/src/routes/admin-rooms.ts:293-325` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.room`
