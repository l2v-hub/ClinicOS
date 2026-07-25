---
id: "api.backend.get-root-49"
kind: "api-endpoint"
title: "GET /"
status: "observed"
summary: "GET / endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/health.ts"
    symbol: "router"
    line_start: "5"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/health.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.get-root-49` represent in ClinicOS?

## Canonical Definition

api.backend.get-root-49 is the canonical api-endpoint named GET /.

## Inputs

- Method: `GET`
- Path: `/`
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

- `backend/src/routes/health.ts:5-11` — router

## Related Knowledge

- `belongs-to` → `project.backend`
