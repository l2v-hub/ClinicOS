---
id: 'api.backend.get-intake-drafts-52'
kind: 'api-endpoint'
title: 'GET /intake/drafts/'
status: 'observed'
summary: 'GET /intake/drafts/ endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/intake-drafts.ts'
    symbol: 'intakeDraftsRouter'
    line_start: '75'
    line_end: '83'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/intake-drafts.ts'
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

What does `api.backend.get-intake-drafts-52` represent in ClinicOS?

## Canonical Definition

api.backend.get-intake-drafts-52 is the canonical api-endpoint named GET /intake/drafts/.

## Inputs

- Method: `GET`
- Path: `/intake/drafts/`
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

- `backend/src/routes/intake-drafts.ts:75-83` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
