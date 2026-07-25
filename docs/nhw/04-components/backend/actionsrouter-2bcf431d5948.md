---
id: "component.backend.backend.src.routes.ai-actions.actionsrouter"
kind: "typescript-constant"
title: "actionsRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/ai-actions.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-actions.ts"
    symbol: "actionsRouter"
    line_start: "23"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-actions.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-actions.actionsrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-actions.actionsrouter is the canonical typescript-constant named actionsRouter.

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

The symbol is exported across its module boundary as `actionsRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-actions.ts:23-23` — actionsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
