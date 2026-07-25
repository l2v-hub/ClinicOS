---
id: "component.backend.backend.src.ai.voice.types.write-action-types"
kind: "typescript-constant"
title: "WRITE_ACTION_TYPES"
status: "observed"
summary: "Exported constant from backend/src/ai/voice/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/types.ts"
    symbol: "WRITE_ACTION_TYPES"
    line_start: "21"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.types.write-action-types` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.types.write-action-types is the canonical typescript-constant named WRITE_ACTION_TYPES.

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

The symbol is exported across its module boundary as `WRITE_ACTION_TYPES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/types.ts:21-29` — WRITE_ACTION_TYPES

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
