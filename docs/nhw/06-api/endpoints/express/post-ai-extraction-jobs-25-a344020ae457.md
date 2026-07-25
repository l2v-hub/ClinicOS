---
id: "api.backend.post-ai-extraction-jobs-25"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/"
status: "observed"
summary: "POST /ai/extraction/jobs/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "68"
    line_end: "87"
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

What does `api.backend.post-ai-extraction-jobs-25` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-25 is the canonical api-endpoint named POST /ai/extraction/jobs/.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/`
- Request inputs: `["req.files"]`
- Middleware/dependencies: `["upload.array"]`

## Outputs

Observed HTTP statuses: `[201]`; response model: `not explicitly declared`.

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

- `backend/src/routes/ai-jobs.ts:68-87` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
