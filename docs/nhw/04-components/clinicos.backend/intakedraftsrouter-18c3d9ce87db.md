---
id: "component.backend.backend.src.routes.intake-drafts.intakedraftsrouter"
kind: "typescript-constant"
title: "intakeDraftsRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/intake-drafts.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/routes/intake-drafts.ts"
    symbol: "intakeDraftsRouter"
    line_start: "16"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/intake-drafts.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.intake-drafts.intakedraftsrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.intake-drafts.intakedraftsrouter is the canonical typescript-constant named intakeDraftsRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `intakeDraftsRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/intake-drafts.ts:16-16` — intakeDraftsRouter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
