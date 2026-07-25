---
id: "api.backend.get-ai-extraction-status-22"
kind: "api-endpoint"
title: "GET /ai/extraction/status"
status: "observed"
summary: "GET /ai/extraction/status endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/ai-extraction.ts"
    symbol: "aiExtractionRouter"
    line_start: "14"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-extraction.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.get-ai-extraction-status-22` represent in ClinicOS?

## Canonical Definition

api.backend.get-ai-extraction-status-22 is the canonical api-endpoint named GET /ai/extraction/status.

## Inputs

- Method: `GET`
- Path: `/ai/extraction/status`
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

- `backend/src/routes/ai-extraction.ts:14-16` — aiExtractionRouter

## Related Knowledge

- `belongs-to` → `project.backend`
