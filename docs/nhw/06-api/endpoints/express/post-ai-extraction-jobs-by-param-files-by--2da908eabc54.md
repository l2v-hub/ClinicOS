---
id: "api.backend.post-ai-extraction-jobs-by-param-files-by-param-logical-30"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/:id/files/:docId/logical"
status: "observed"
summary: "POST /ai/extraction/jobs/:id/files/:docId/logical endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "137"
    line_end: "145"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.post-ai-extraction-jobs-by-param-files-by-param-logical-30` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-by-param-files-by-param-logical-30 is the canonical api-endpoint named POST /ai/extraction/jobs/:id/files/:docId/logical.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/:id/files/:docId/logical`
- Request inputs: `["req.body.logicalDoc","req.params.docId","req.params.id"]`
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

- `backend/src/routes/ai-jobs.ts:137-145` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
