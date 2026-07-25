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
    target: "project.backend"
    evidence: "backend/src/ai/assistant/llm-planner.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
