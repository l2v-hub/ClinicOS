---
id: "api.backend.put-admin-beds-by-param-11"
kind: "api-endpoint"
title: "PUT /admin/beds/:bedId"
status: "observed"
summary: "PUT /admin/beds/:bedId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/routes/admin-rooms.ts"
    symbol: "adminRouter"
    line_start: "408"
    line_end: "455"
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
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `api.backend.put-admin-beds-by-param-11` represent in ClinicOS?

## Canonical Definition

api.backend.put-admin-beds-by-param-11 is the canonical api-endpoint named PUT /admin/beds/:bedId.

## Inputs

- Method: `PUT`
- Path: `/admin/beds/:bedId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.findUnique","prisma.bed.update"]`
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

- `backend/src/routes/admin-rooms.ts:408-455` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.bed`
