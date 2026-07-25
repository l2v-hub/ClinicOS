---
id: "api.backend.get-health-1"
kind: "api-endpoint"
title: "GET /health"
status: "observed"
summary: "GET /health endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/app.ts"
    symbol: "app"
    line_start: "78"
    line_end: "80"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/app.ts"
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

What does `api.backend.get-health-1` represent in ClinicOS?

## Canonical Definition

api.backend.get-health-1 is the canonical api-endpoint named GET /health.

## Inputs

- Method: `GET`
- Path: `/health`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200]`; response model: `not explicitly declared`.

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

Observed error statuses: None observed. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/app.ts:78-80` — app

## Related Knowledge

- `belongs-to` → `project.backend`
