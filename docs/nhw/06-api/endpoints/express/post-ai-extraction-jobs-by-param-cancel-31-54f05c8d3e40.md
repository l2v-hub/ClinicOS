---
id: "api.backend.post-ai-extraction-jobs-by-param-cancel-31"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/:id/cancel"
status: "observed"
summary: "POST /ai/extraction/jobs/:id/cancel endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "148"
    line_end: "158"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.post-ai-extraction-jobs-by-param-cancel-31` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-by-param-cancel-31 is the canonical api-endpoint named POST /ai/extraction/jobs/:id/cancel.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/:id/cancel`
- Request inputs: `["req.params.id"]`
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

- `backend/src/routes/ai-jobs.ts:148-158` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
