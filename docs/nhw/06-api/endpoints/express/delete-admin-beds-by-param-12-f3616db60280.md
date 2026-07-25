---
id: 'api.backend.delete-admin-beds-by-param-12'
kind: 'api-endpoint'
title: 'DELETE /admin/beds/:bedId'
status: 'observed'
summary: 'DELETE /admin/beds/:bedId endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.facility-occupancy'
sources:
  - path: 'backend/src/routes/admin-rooms.ts'
    symbol: 'adminRouter'
    line_start: '458'
    line_end: '485'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.bed'
    evidence: 'backend/src/routes/admin-rooms.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'delete'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.delete-admin-beds-by-param-12` represent in ClinicOS?

## Canonical Definition

api.backend.delete-admin-beds-by-param-12 is the canonical api-endpoint named DELETE /admin/beds/:bedId.

## Inputs

- Method: `DELETE`
- Path: `/admin/beds/:bedId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.bed.delete","prisma.bed.findUnique"]`
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

- `backend/src/routes/admin-rooms.ts:458-485` — adminRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.bed`
