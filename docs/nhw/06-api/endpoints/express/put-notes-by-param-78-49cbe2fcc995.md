---
id: "api.backend.put-notes-by-param-78"
kind: "api-endpoint"
title: "PUT /notes/:id"
status: "observed"
summary: "PUT /notes/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "56"
    line_end: "95"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/note.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.nota"
    evidence: "backend/src/routes/note.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.put-notes-by-param-78` represent in ClinicOS?

## Canonical Definition

api.backend.put-notes-by-param-78 is the canonical api-endpoint named PUT /notes/:id.

## Inputs

- Method: `PUT`
- Path: `/notes/:id`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.nota.findUnique","prisma.nota.update"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/note.ts:56-95` — noteRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.nota`
