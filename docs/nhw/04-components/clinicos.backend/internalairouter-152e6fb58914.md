---
id: "component.backend.backend.src.routes.internal-ai.internalairouter"
kind: "typescript-constant"
title: "internalAiRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/internal-ai.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/internal-ai.ts"
    symbol: "internalAiRouter"
    line_start: "10"
    line_end: "10"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/internal-ai.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.internal-ai.internalairouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.internal-ai.internalairouter is the canonical typescript-constant named internalAiRouter.

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

The symbol is exported across its module boundary as `internalAiRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/internal-ai.ts:10-10` — internalAiRouter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
