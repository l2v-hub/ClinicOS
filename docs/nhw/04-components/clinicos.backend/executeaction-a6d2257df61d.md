---
id: "component.backend.backend.src.ai.voice.execute.executeaction"
kind: "typescript-function"
title: "executeAction"
status: "observed"
summary: "Exported function from backend/src/ai/voice/execute.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/execute.ts"
    symbol: "executeAction"
    line_start: "107"
    line_end: "212"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/execute.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.execute.executeaction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.execute.executeaction is the canonical typescript-function named executeAction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `executeAction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/execute.ts:107-212` — executeAction

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
