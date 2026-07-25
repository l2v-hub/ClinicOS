---
id: 'api.backend.get-admin-rooms-by-param-beds-9'
kind: 'api-endpoint'
title: 'GET /admin/rooms/:roomId/beds'
status: 'observed'
summary: 'GET /admin/rooms/:roomId/beds endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.facility-occupancy'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'adminRouter'
    line_start: '332'
    line_end: '356'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'reads'
    target: 'data.model.bed'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.get-admin-rooms-by-param-beds-9` represent in ClinicOS?

## Canonical Definition

api.backend.get-admin-rooms-by-param-beds-9 is the canonical api-endpoint named GET /admin/rooms/:roomId/beds.

## Inputs

- Method: `GET`
- Path: `/admin/rooms/:roomId/beds`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.findMany","prisma.room.findUnique"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/admin-rooms.ts:332-356` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.bed`
- `reads` → `data.model.room`
