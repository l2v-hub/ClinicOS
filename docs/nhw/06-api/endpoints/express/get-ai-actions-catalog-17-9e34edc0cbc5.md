---
id: 'api.backend.get-ai-actions-catalog-17'
kind: 'api-endpoint'
title: 'GET /ai/actions/catalog'
status: 'observed'
summary: 'GET /ai/actions/catalog endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/routes/ai-actions.ts'
    symbol: 'actionsRouter'
    line_start: '77'
    line_end: '79'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-actions.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'get'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.get-ai-actions-catalog-17` represent in ClinicOS?

## Canonical Definition

api.backend.get-ai-actions-catalog-17 is the canonical api-endpoint named GET /ai/actions/catalog.

## Inputs

- Method: `GET`
- Path: `/ai/actions/catalog`
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

- `backend/src/routes/ai-actions.ts:77-79` — actionsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
