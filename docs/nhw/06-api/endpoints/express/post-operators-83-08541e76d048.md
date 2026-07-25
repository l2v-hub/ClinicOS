---
id: 'api.backend.post-operators-83'
kind: 'api-endpoint'
title: 'POST /operators/'
status: 'observed'
summary: 'POST /operators/ endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'backend/src/routes/operators.ts'
    symbol: 'operatorsRouter'
    line_start: '123'
    line_end: '185'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/operators.ts'
    confidence: 'observed'
  - type: 'writes'
    target: 'data.model.user'
    evidence: 'backend/src/routes/operators.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.post-operators-83` represent in ClinicOS?

## Canonical Definition

api.backend.post-operators-83 is the canonical api-endpoint named POST /operators/.

## Inputs

- Method: `POST`
- Path: `/operators/`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.user.create"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:123-185` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.user`
