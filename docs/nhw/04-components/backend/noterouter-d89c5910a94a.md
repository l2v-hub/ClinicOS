---
id: "component.backend.backend.src.routes.note.noterouter"
kind: "typescript-constant"
title: "noteRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/note.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/routes/note.ts"
    symbol: "noteRouter"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/note.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.routes.note.noterouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.note.noterouter is the canonical typescript-constant named noteRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `noteRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/note.ts:4-4` — noteRouter

## Related Knowledge

- `belongs-to` → `project.backend`
