---
id: "api.backend.post-admin-rooms-5"
kind: "api-endpoint"
title: "POST /admin/rooms"
status: "observed"
summary: "POST /admin/rooms endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "145"
    line_end: "202"
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
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.post-admin-rooms-5` represent in ClinicOS?

## Canonical Definition

api.backend.post-admin-rooms-5 is the canonical api-endpoint named POST /admin/rooms.

## Inputs

- Method: `POST`
- Path: `/admin/rooms`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.room.create"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:145-202` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.room`
