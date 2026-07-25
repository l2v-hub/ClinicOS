---
id: "api.backend.post-intake-drafts-from-import-50"
kind: "api-endpoint"
title: "POST /intake/drafts/from-import"
status: "observed"
summary: "POST /intake/drafts/from-import endpoint implemented by the express runtime."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/intake-drafts.ts"
    symbol: "intakeDraftsRouter"
    line_start: "40"
    line_end: "56"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
