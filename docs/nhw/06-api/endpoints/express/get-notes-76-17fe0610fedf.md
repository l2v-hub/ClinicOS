---
id: "api.backend.get-notes-76"
kind: "api-endpoint"
title: "GET /notes/"
status: "observed"
summary: "GET /notes/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "14"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/note.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.nota"
    evidence: "backend/src/routes/note.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `api.backend.get-notes-76` represent in ClinicOS?

## Canonical Definition

api.backend.get-notes-76 is the canonical api-endpoint named GET /notes/.

## Inputs

- Method: `GET`
- Path: `/notes/`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.nota.findMany"]`
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

- `backend/src/routes/note.ts:14-22` — noteRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.nota`
