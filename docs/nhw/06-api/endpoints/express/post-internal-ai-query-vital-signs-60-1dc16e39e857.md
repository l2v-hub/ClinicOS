---
id: 'api.backend.post-internal-ai-query-vital-signs-60'
kind: 'api-endpoint'
title: 'POST /internal/ai/query/vital-signs'
status: 'observed'
summary: 'POST /internal/ai/query/vital-signs endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/routes/internal-ai.ts'
    symbol: 'internalAiRouter'
    line_start: '67'
    line_end: '70'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/internal-ai.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.post-internal-ai-query-vital-signs-60` represent in ClinicOS?

## Canonical Definition

api.backend.post-internal-ai-query-vital-signs-60 is the canonical api-endpoint named POST /internal/ai/query/vital-signs.

## Inputs

- Method: `POST`
- Path: `/internal/ai/query/vital-signs`
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

- `backend/src/routes/internal-ai.ts:67-70` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.backend`
