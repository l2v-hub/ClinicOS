---
id: "component.backend.backend.src.ai.assistant.service.assistantanswer"
kind: "typescript-interface"
title: "AssistantAnswer"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/service.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/service.ts"
    symbol: "AssistantAnswer"
    line_start: "37"
    line_end: "53"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.service.assistantanswer` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.service.assistantanswer is the canonical typescript-interface named AssistantAnswer.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `AssistantAnswer`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/service.ts:37-53` — AssistantAnswer

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
