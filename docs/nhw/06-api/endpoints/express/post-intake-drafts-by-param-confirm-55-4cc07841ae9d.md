---
id: "api.backend.post-intake-drafts-by-param-confirm-55"
kind: "api-endpoint"
title: "POST /intake/drafts/:id/confirm"
status: "observed"
summary: "POST /intake/drafts/:id/confirm endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/intake-drafts.ts"
    symbol: "intakeDraftsRouter"
    line_start: "110"
    line_end: "121"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/intake-drafts.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.post-intake-drafts-by-param-confirm-55` represent in ClinicOS?

## Canonical Definition

api.backend.post-intake-drafts-by-param-confirm-55 is the canonical api-endpoint named POST /intake/drafts/:id/confirm.

## Inputs

- Method: `POST`
- Path: `/intake/drafts/:id/confirm`
- Request inputs: `["req.body","req.params.id"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[409]`; response model: `not explicitly declared`.

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

Observed error statuses: `[409]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/intake-drafts.ts:110-121` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
