---
id: "component.backend.backend.src.ai.merge.mergedlist"
kind: "typescript-interface"
title: "MergedList"
status: "observed"
summary: "Exported interface from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "MergedList"
    line_start: "47"
    line_end: "51"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergedlist` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergedlist is the canonical typescript-interface named MergedList.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/merge.test.ts`

## Invariants

The symbol is exported across its module boundary as `MergedList`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:47-51` — MergedList

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
