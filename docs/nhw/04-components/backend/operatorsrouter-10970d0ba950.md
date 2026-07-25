---
id: "component.backend.backend.src.routes.operators.operatorsrouter"
kind: "typescript-constant"
title: "operatorsRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/operators.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.routes.operators.operatorsrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.operators.operatorsrouter is the canonical typescript-constant named operatorsRouter.

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

The symbol is exported across its module boundary as `operatorsRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:9-9` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
