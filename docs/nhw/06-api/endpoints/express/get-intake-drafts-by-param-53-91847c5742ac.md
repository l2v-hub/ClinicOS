---
id: 'api.backend.get-intake-drafts-by-param-53'
kind: 'api-endpoint'
title: 'GET /intake/drafts/:id'
status: 'observed'
summary: 'GET /intake/drafts/:id endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/intake-drafts.ts'
    symbol: 'intakeDraftsRouter'
    line_start: '86'
    line_end: '94'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/intake-drafts.ts'
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

What does `api.backend.get-intake-drafts-by-param-53` represent in ClinicOS?

## Canonical Definition

api.backend.get-intake-drafts-by-param-53 is the canonical api-endpoint named GET /intake/drafts/:id.

## Inputs

- Method: `GET`
- Path: `/intake/drafts/:id`
- Request inputs: `["req.params.id"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404]`; response model: `not explicitly declared`.

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

Observed error statuses: `[404]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/intake-drafts.ts:86-94` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
