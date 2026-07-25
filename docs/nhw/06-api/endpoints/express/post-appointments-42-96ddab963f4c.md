---
id: "api.backend.post-appointments-42"
kind: "api-endpoint"
title: "POST /appointments/"
status: "observed"
summary: "POST /appointments/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "backend/src/routes/appointments.ts"
    symbol: "router"
    line_start: "42"
    line_end: "88"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/appointments.ts"
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

What does `api.backend.post-appointments-42` represent in ClinicOS?

## Canonical Definition

api.backend.post-appointments-42 is the canonical api-endpoint named POST /appointments/.

## Inputs

- Method: `POST`
- Path: `/appointments/`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,409,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/appointments.ts:42-88` — router

## Related Knowledge

- `belongs-to` → `project.backend`
