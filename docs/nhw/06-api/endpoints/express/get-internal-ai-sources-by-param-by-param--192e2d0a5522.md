---
id: "api.backend.get-internal-ai-sources-by-param-by-param-71"
kind: "api-endpoint"
title: "GET /internal/ai/sources/:sourceType/:recordId"
status: "observed"
summary: "GET /internal/ai/sources/:sourceType/:recordId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "132"
    line_end: "147"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.get-internal-ai-sources-by-param-by-param-71` represent in ClinicOS?

## Canonical Definition

api.backend.get-internal-ai-sources-by-param-by-param-71 is the canonical api-endpoint named GET /internal/ai/sources/:sourceType/:recordId.

## Inputs

- Method: `GET`
- Path: `/internal/ai/sources/:sourceType/:recordId`
- Request inputs: `["req.params.recordId","req.params.sourceType"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: None observed; response model: `not explicitly declared`.

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

- `backend/src/routes/internal-ai.ts:132-147` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
