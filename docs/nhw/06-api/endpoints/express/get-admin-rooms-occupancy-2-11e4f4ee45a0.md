---
id: 'api.backend.get-admin-rooms-occupancy-2'
kind: 'api-endpoint'
title: 'GET /admin/rooms/occupancy'
status: 'observed'
summary: 'GET /admin/rooms/occupancy endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.facility-occupancy'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'adminRouter'
    line_start: '43'
    line_end: '87'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'reads'
    target: 'data.model.room'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'get'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.get-admin-rooms-occupancy-2` represent in ClinicOS?

## Canonical Definition

api.backend.get-admin-rooms-occupancy-2 is the canonical api-endpoint named GET /admin/rooms/occupancy.

## Inputs

- Method: `GET`
- Path: `/admin/rooms/occupancy`
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

- `backend/src/routes/admin-rooms.ts:43-87` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.room`
