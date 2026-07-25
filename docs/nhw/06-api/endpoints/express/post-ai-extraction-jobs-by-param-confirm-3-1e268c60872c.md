---
id: "api.backend.post-ai-extraction-jobs-by-param-confirm-35"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/:id/confirm"
status: "observed"
summary: "POST /ai/extraction/jobs/:id/confirm endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "207"
    line_end: "219"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-jobs.ts"
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

What does `api.backend.post-ai-extraction-jobs-by-param-confirm-35` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-by-param-confirm-35 is the canonical api-endpoint named POST /ai/extraction/jobs/:id/confirm.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/:id/confirm`
- Request inputs: `["req.body","req.params.id"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[409]`; response model: `not explicitly declared`.

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

Observed error statuses: `[409]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-jobs.ts:207-219` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
