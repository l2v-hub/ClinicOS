---
id: "api.backend.patch-intake-drafts-by-param-54"
kind: "api-endpoint"
title: "PATCH /intake/drafts/:id"
status: "observed"
summary: "PATCH /intake/drafts/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/intake-drafts.ts"
    symbol: "intakeDraftsRouter"
    line_start: "97"
    line_end: "105"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/intake-drafts.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "patch"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.patch-intake-drafts-by-param-54` represent in ClinicOS?

## Canonical Definition

api.backend.patch-intake-drafts-by-param-54 is the canonical api-endpoint named PATCH /intake/drafts/:id.

## Inputs

- Method: `PATCH`
- Path: `/intake/drafts/:id`
- Request inputs: `["req.body","req.params.id"]`
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

- `backend/src/routes/intake-drafts.ts:97-105` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
