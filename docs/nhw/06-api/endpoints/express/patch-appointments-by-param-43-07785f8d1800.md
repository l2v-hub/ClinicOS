---
id: "api.backend.patch-appointments-by-param-43"
kind: "api-endpoint"
title: "PATCH /appointments/:id"
status: "observed"
summary: "PATCH /appointments/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/routes/appointments.ts"
    symbol: "router"
    line_start: "91"
    line_end: "122"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/appointments.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "patch"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.patch-appointments-by-param-43` represent in ClinicOS?

## Canonical Definition

api.backend.patch-appointments-by-param-43 is the canonical api-endpoint named PATCH /appointments/:id.

## Inputs

- Method: `PATCH`
- Path: `/appointments/:id`
- Request inputs: `["req.body","req.params.id"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,404,409,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/appointments.ts:91-122` — router

## Related Knowledge

- `belongs-to` → `project.backend`
