---
id: 'api.backend.post-ai-actions-plan-18'
kind: 'api-endpoint'
title: 'POST /ai/actions/plan'
status: 'observed'
summary: 'POST /ai/actions/plan endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/routes/ai-actions.ts'
    symbol: 'actionsRouter'
    line_start: '82'
    line_end: '108'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-actions.ts'
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

What does `api.backend.post-ai-actions-plan-18` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-actions-plan-18 is the canonical api-endpoint named POST /ai/actions/plan.

## Inputs

- Method: `POST`
- Path: `/ai/actions/plan`
- Request inputs: `["req.body.agent","req.body.currentPatientId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,403]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,403]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-actions.ts:82-108` — actionsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
