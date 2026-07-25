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
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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

Owning project: `project.clinicos.backend`.

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

- `belongs-to` → `project.clinicos.backend`
