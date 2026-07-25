---
id: "component.backend.backend.src.ai.assistant.composer.composeanswer"
kind: "typescript-function"
title: "composeAnswer"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/composer.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/composer.ts"
    symbol: "composeAnswer"
    line_start: "37"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/composer.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.composer.composeanswer` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.composer.composeanswer is the canonical typescript-function named composeAnswer.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/composer.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `composeAnswer`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/composer.ts:37-57` — composeAnswer

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
