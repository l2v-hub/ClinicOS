---
id: "component.backend.backend.src.ai.merge.mergeextractions"
kind: "typescript-function"
title: "mergeExtractions"
status: "observed"
summary: "Exported function from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "mergeExtractions"
    line_start: "247"
    line_end: "293"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergeextractions` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergeextractions is the canonical typescript-function named mergeExtractions.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/merge.test.ts`
- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `mergeExtractions`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:247-293` — mergeExtractions

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
