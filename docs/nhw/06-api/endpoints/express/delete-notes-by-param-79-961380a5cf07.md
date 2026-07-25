---
id: "api.backend.delete-notes-by-param-79"
kind: "api-endpoint"
title: "DELETE /notes/:id"
status: "observed"
summary: "DELETE /notes/:id endpoint implemented by the express runtime."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "98"
    line_end: "113"
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
  - "delete"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.delete-notes-by-param-79` represent in ClinicOS?

## Canonical Definition

api.backend.delete-notes-by-param-79 is the canonical api-endpoint named DELETE /notes/:id.

## Inputs

- Method: `DELETE`
- Path: `/notes/:id`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[204,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.nota.delete","prisma.nota.findUnique"]`
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

- `backend/src/routes/note.ts:98-113` — noteRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.nota`
