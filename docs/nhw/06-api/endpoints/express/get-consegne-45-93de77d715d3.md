---
id: "api.backend.get-consegne-45"
kind: "api-endpoint"
title: "GET /consegne/"
status: "observed"
summary: "GET /consegne/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "18"
    line_end: "28"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.consegna"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.get-consegne-45` represent in ClinicOS?

## Canonical Definition

api.backend.get-consegne-45 is the canonical api-endpoint named GET /consegne/.

## Inputs

- Method: `GET`
- Path: `/consegne/`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.consegna.findMany"]`
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

- `backend/src/routes/consegne.ts:18-28` — consegneRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.consegna`
