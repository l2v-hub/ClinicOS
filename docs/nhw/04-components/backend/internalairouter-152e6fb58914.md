---
id: 'component.backend.backend.src.routes.internal-ai.internalairouter'
kind: 'typescript-constant'
title: 'internalAiRouter'
status: 'observed'
summary: 'Exported constant from backend/src/routes/internal-ai.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/routes/internal-ai.ts'
    symbol: 'internalAiRouter'
    line_start: '10'
    line_end: '10'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/internal-ai.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
