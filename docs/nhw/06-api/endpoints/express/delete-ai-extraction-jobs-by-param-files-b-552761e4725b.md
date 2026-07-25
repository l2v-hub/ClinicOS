---
id: 'api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28'
kind: 'api-endpoint'
title: 'DELETE /ai/extraction/jobs/:id/files/:docId'
status: 'observed'
summary: 'DELETE /ai/extraction/jobs/:id/files/:docId endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/ai-jobs.ts'
    symbol: 'aiJobsRouter'
    line_start: '116'
    line_end: '123'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-jobs.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'delete'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28` represent in ClinicOS?

## Canonical Definition

api.backend.delete-ai-extraction-jobs-by-param-files-by-param-28 is the canonical api-endpoint named DELETE /ai/extraction/jobs/:id/files/:docId.

## Inputs

- Method: `DELETE`
- Path: `/ai/extraction/jobs/:id/files/:docId`
- Request inputs: `["req.params.docId","req.params.id"]`
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

- `backend/src/routes/ai-jobs.ts:116-123` — aiJobsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
