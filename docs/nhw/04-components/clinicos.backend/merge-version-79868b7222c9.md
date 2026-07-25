---
id: "component.backend.backend.src.ai.merge.merge-version"
kind: "typescript-constant"
title: "MERGE_VERSION"
status: "observed"
summary: "Exported constant from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "MERGE_VERSION"
    line_start: "11"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.merge-version` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.merge-version is the canonical typescript-constant named MERGE_VERSION.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `MERGE_VERSION`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:11-11` — MERGE_VERSION

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
