---
id: "component.backend.backend.src.ai.assistant.plan.assistantintent"
kind: "typescript-type-alias"
title: "AssistantIntent"
status: "observed"
summary: "Exported type-alias from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "AssistantIntent"
    line_start: "6"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.assistantintent` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.assistantintent is the canonical typescript-type-alias named AssistantIntent.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/agents.ts`
- `backend/src/ai/assistant/llm-planner.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `AssistantIntent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:6-22` — AssistantIntent

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
