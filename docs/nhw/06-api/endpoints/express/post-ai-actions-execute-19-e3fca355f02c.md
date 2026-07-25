---
id: "api.backend.post-ai-actions-execute-19"
kind: "api-endpoint"
title: "POST /ai/actions/execute"
status: "observed"
summary: "POST /ai/actions/execute endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-actions.ts"
    symbol: "actionsRouter"
    line_start: "111"
    line_end: "135"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-actions.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `api.backend.post-ai-actions-execute-19` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-actions-execute-19 is the canonical api-endpoint named POST /ai/actions/execute.

## Inputs

- Method: `POST`
- Path: `/ai/actions/execute`
- Request inputs: `["req.body.patientId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-actions.ts:111-135` — actionsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
