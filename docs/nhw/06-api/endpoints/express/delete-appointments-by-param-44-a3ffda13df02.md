---
id: 'api.backend.delete-appointments-by-param-44'
kind: 'api-endpoint'
title: 'DELETE /appointments/:id'
status: 'observed'
summary: 'DELETE /appointments/:id endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.scheduling'
sources:
  - path: 'backend/src/routes/appointments.ts'
    symbol: 'router'
    line_start: '125'
    line_end: '140'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/appointments.ts'
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

What does `api.backend.delete-appointments-by-param-44` represent in ClinicOS?

## Canonical Definition

api.backend.delete-appointments-by-param-44 is the canonical api-endpoint named DELETE /appointments/:id.

## Inputs

- Method: `DELETE`
- Path: `/appointments/:id`
- Request inputs: `["req.params.id"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
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

- `backend/src/routes/appointments.ts:125-140` — router

## Related Knowledge

- `belongs-to` → `project.backend`
