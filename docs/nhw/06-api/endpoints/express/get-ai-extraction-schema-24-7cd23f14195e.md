---
id: 'api.backend.get-ai-extraction-schema-24'
kind: 'api-endpoint'
title: 'GET /ai/extraction/schema'
status: 'observed'
summary: 'GET /ai/extraction/schema endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/ai-extraction.ts'
    symbol: 'aiExtractionRouter'
    line_start: '40'
    line_end: '46'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-extraction.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'get'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.get-ai-extraction-schema-24` represent in ClinicOS?

## Canonical Definition

api.backend.get-ai-extraction-schema-24 is the canonical api-endpoint named GET /ai/extraction/schema.

## Inputs

- Method: `GET`
- Path: `/ai/extraction/schema`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-extraction.ts:40-46` — aiExtractionRouter

## Related Knowledge

- `belongs-to` → `project.backend`
