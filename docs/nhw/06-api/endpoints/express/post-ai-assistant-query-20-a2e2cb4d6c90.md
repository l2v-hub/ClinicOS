---
id: "api.backend.post-ai-assistant-query-20"
kind: "api-endpoint"
title: "POST /ai/assistant/query"
status: "observed"
summary: "POST /ai/assistant/query endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-assistant-public.ts"
    symbol: "assistantPublicRouter"
    line_start: "55"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-assistant-public.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.post-ai-assistant-query-20` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-assistant-query-20 is the canonical api-endpoint named POST /ai/assistant/query.

## Inputs

- Method: `POST`
- Path: `/ai/assistant/query`
- Request inputs: `["req.body.currentPatientId"]`
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

- `backend/src/routes/ai-assistant-public.ts:55-68` — assistantPublicRouter

## Related Knowledge

- `belongs-to` → `project.backend`
