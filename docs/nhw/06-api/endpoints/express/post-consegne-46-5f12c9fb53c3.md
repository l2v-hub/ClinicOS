---
id: "api.backend.post-consegne-46"
kind: "api-endpoint"
title: "POST /consegne/"
status: "observed"
summary: "POST /consegne/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "31"
    line_end: "59"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.post-consegne-46` represent in ClinicOS?

## Canonical Definition

api.backend.post-consegne-46 is the canonical api-endpoint named POST /consegne/.

## Inputs

- Method: `POST`
- Path: `/consegne/`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,500]`; response model: `not explicitly declared`.

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

- `backend/src/routes/consegne.ts:31-59` — consegneRouter

## Related Knowledge

- `belongs-to` → `project.backend`
