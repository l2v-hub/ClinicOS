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
    target: "project.backend"
    evidence: "backend/src/routes/intake-drafts.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
