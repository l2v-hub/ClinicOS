---
id: "api.backend.post-internal-ai-assistant-query-70"
kind: "api-endpoint"
title: "POST /internal/ai/assistant/query"
status: "observed"
summary: "POST /internal/ai/assistant/query endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "122"
    line_end: "129"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `api.backend.post-internal-ai-assistant-query-70` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-assistant-query-70 is the canonical api-endpoint named POST /internal/ai/assistant/query.

## Inputs

- Method: `POST`
- Path: `/internal/ai/assistant/query`
- Request inputs: None observed
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

- `backend/src/routes/internal-ai.ts:122-129` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
