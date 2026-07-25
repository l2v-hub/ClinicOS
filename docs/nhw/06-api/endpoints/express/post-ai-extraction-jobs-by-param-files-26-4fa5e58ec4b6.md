---
id: "api.backend.post-ai-extraction-jobs-by-param-files-26"
kind: "api-endpoint"
title: "POST /ai/extraction/jobs/:id/files"
status: "observed"
summary: "POST /ai/extraction/jobs/:id/files endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-jobs.ts"
    symbol: "aiJobsRouter"
    line_start: "90"
    line_end: "102"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.post-ai-extraction-jobs-by-param-files-26` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-extraction-jobs-by-param-files-26 is the canonical api-endpoint named POST /ai/extraction/jobs/:id/files.

## Inputs

- Method: `POST`
- Path: `/ai/extraction/jobs/:id/files`
- Request inputs: `["req.files","req.params.id"]`
- Middleware/dependencies: `["upload.array"]`

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

- `backend/src/routes/ai-jobs.ts:90-102` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
