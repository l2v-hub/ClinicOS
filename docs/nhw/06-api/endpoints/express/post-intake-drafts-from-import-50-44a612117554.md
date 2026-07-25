---
id: 'api.backend.post-intake-drafts-from-import-50'
kind: 'api-endpoint'
title: 'POST /intake/drafts/from-import'
status: 'observed'
summary: 'POST /intake/drafts/from-import endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/intake-drafts.ts'
    symbol: 'intakeDraftsRouter'
    line_start: '40'
    line_end: '56'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/intake-drafts.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `api.backend.post-intake-drafts-from-import-50` represent in ClinicOS?

## Canonical Definition

api.backend.post-intake-drafts-from-import-50 is the canonical api-endpoint named POST /intake/drafts/from-import.

## Inputs

- Method: `POST`
- Path: `/intake/drafts/from-import`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,422]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400,422]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/intake-drafts.ts:40-56` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
