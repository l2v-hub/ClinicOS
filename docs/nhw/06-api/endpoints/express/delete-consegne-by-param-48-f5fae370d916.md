---
id: "api.backend.delete-consegne-by-param-48"
kind: "api-endpoint"
title: "DELETE /consegne/:id"
status: "observed"
summary: "DELETE /consegne/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "107"
    line_end: "122"
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
  - "delete"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `api.backend.delete-consegne-by-param-48` represent in ClinicOS?

## Canonical Definition

api.backend.delete-consegne-by-param-48 is the canonical api-endpoint named DELETE /consegne/:id.

## Inputs

- Method: `DELETE`
- Path: `/consegne/:id`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.consegna.delete","prisma.consegna.findUnique"]`
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

- `backend/src/routes/consegne.ts:107-122` — consegneRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.consegna`
