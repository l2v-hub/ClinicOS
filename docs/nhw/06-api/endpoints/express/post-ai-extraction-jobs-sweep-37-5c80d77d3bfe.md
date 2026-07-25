---
id: "api.backend.post-ai-extraction-jobs-sweep-37"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/sweep"
status: "observed"
summary: "POST /ai/extraction/jobs/sweep endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "233"
    line_end: "240"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.post-ai-extraction-jobs-sweep-37` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-sweep-37 is the canonical api-endpoint named POST /ai/extraction/jobs/sweep.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/sweep`
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

- `backend/src/routes/ai-jobs.ts:233-240` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
