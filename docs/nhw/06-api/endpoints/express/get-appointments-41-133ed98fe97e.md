---
id: "api.backend.get-appointments-41"
kind: "api-endpoint"
title: "GET /appointments/"
status: "observed"
summary: "GET /appointments/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/routes/appointments.ts"
    symbol: "router"
    line_start: "20"
    line_end: "39"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/appointments.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `api.backend.get-appointments-41` represent in ClinicOS?

## Canonical Definition

api.backend.get-appointments-41 is the canonical api-endpoint named GET /appointments/.

## Inputs

- Method: `GET`
- Path: `/appointments/`
- Request inputs: `["req.query.date","req.query.operatorId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/appointments.ts:20-39` — router

## Related Knowledge

- `belongs-to` → `project.backend`
