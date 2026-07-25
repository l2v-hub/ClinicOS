---
id: "component.backend.backend.src.ai.voice.types.iswriteaction"
kind: "typescript-function"
title: "isWriteAction"
status: "observed"
summary: "Exported function from backend/src/ai/voice/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/types.ts"
    symbol: "isWriteAction"
    line_start: "31"
    line_end: "33"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.types.iswriteaction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.types.iswriteaction is the canonical typescript-function named isWriteAction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/appointments.ts`
- `backend/src/ai/actions/consegne.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/execute.ts`
- `backend/src/ai/voice/plan.ts`
- `backend/src/ai/voice/preview.ts`

## Invariants

The symbol is exported across its module boundary as `isWriteAction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/types.ts:31-33` — isWriteAction

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
