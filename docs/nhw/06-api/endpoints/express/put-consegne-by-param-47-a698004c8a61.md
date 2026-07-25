---
id: "api.backend.put-consegne-by-param-47"
kind: "api-endpoint"
title: "PUT /consegne/:id"
status: "observed"
summary: "PUT /consegne/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "62"
    line_end: "104"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.consegna"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.put-consegne-by-param-47` represent in ClinicOS?

## Canonical Definition

api.backend.put-consegne-by-param-47 is the canonical api-endpoint named PUT /consegne/:id.

## Inputs

- Method: `PUT`
- Path: `/consegne/:id`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.consegna.findUnique","prisma.consegna.update"]`
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

- `backend/src/routes/consegne.ts:62-104` — consegneRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.consegna`
