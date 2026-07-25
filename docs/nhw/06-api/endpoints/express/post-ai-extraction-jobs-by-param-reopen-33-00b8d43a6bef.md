---
id: "api.backend.post-ai-extraction-jobs-by-param-reopen-33"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/:id/reopen"
status: "observed"
summary: "POST /ai/extraction/jobs/:id/reopen endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "176"
    line_end: "188"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.post-ai-extraction-jobs-by-param-reopen-33` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-by-param-reopen-33 is the canonical api-endpoint named POST /ai/extraction/jobs/:id/reopen.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/:id/reopen`
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

- `backend/src/routes/ai-jobs.ts:176-188` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
