---
id: 'api.backend.get-operators-80'
kind: 'api-endpoint'
title: 'GET /operators/'
status: 'observed'
summary: 'GET /operators/ endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'backend/src/routes/operators.ts'
    symbol: 'operatorsRouter'
    line_start: '58'
    line_end: '72'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/operators.ts'
    confidence: 'observed'
  - type: 'reads'
    target: 'data.model.operator'
    evidence: 'backend/src/routes/operators.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'get'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.get-operators-80` represent in ClinicOS?

## Canonical Definition

api.backend.get-operators-80 is the canonical api-endpoint named GET /operators/.

## Inputs

- Method: `GET`
- Path: `/operators/`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.operator.findMany"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:58-72` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.operator`
