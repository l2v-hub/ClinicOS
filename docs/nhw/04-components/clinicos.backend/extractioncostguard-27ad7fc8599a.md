---
id: "component.backend.backend.src.ai.rate-limit.extractioncostguard"
kind: "typescript-constant"
title: "extractionCostGuard"
status: "observed"
summary: "Exported constant from backend/src/ai/rate-limit.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/rate-limit.ts"
    symbol: "extractionCostGuard"
    line_start: "44"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/rate-limit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.rate-limit.extractioncostguard` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.rate-limit.extractioncostguard is the canonical typescript-constant named extractionCostGuard.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`

## Invariants

The symbol is exported across its module boundary as `extractionCostGuard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/rate-limit.ts:44-48` — extractionCostGuard

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
