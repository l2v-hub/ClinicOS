---
id: 'api.backend.post-intake-drafts-51'
kind: 'api-endpoint'
title: 'POST /intake/drafts/'
status: 'observed'
summary: 'POST /intake/drafts/ endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/routes/intake-drafts.ts'
    symbol: 'intakeDraftsRouter'
    line_start: '59'
    line_end: '72'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.post-intake-drafts-51` represent in ClinicOS?

## Canonical Definition

api.backend.post-intake-drafts-51 is the canonical api-endpoint named POST /intake/drafts/.

## Inputs

- Method: `POST`
- Path: `/intake/drafts/`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

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

- `backend/src/routes/intake-drafts.ts:59-72` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
