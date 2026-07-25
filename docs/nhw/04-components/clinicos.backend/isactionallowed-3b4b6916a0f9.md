---
id: "component.backend.backend.src.ai.actions.catalog.isactionallowed"
kind: "typescript-function"
title: "isActionAllowed"
status: "observed"
summary: "Exported function from backend/src/ai/actions/catalog.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/actions/catalog.ts"
    symbol: "isActionAllowed"
    line_start: "97"
    line_end: "101"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/catalog.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.isactionallowed` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.isactionallowed is the canonical typescript-function named isActionAllowed.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `isActionAllowed`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:97-101` — isActionAllowed

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
