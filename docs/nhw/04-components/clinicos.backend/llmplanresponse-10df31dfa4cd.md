---
id: "component.backend.backend.src.ai.assistant.llm-planner.llmplanresponse"
kind: "typescript-interface"
title: "LlmPlanResponse"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/llm-planner.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/llm-planner.ts"
    symbol: "LlmPlanResponse"
    line_start: "16"
    line_end: "19"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/llm-planner.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.llm-planner.llmplanresponse` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.llm-planner.llmplanresponse is the canonical typescript-interface named LlmPlanResponse.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/runtime-client.ts`

## Invariants

The symbol is exported across its module boundary as `LlmPlanResponse`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/llm-planner.ts:16-19` — LlmPlanResponse

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
