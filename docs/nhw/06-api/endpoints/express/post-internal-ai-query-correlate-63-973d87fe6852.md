---
id: "api.backend.post-internal-ai-query-correlate-63"
kind: "api-endpoint"
title: "POST /internal/ai/query/correlate"
status: "observed"
summary: "POST /internal/ai/query/correlate endpoint implemented by the express runtime."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "84"
    line_end: "87"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.post-internal-ai-query-correlate-63` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-query-correlate-63 is the canonical api-endpoint named POST /internal/ai/query/correlate.

## Inputs

- Method: `POST`
- Path: `/internal/ai/query/correlate`
- Request inputs: `["req.body"]`
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

- `backend/src/routes/internal-ai.ts:84-87` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
