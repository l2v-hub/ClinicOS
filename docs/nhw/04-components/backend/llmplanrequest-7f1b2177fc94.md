---
id: "component.backend.backend.src.ai.assistant.llm-planner.llmplanrequest"
kind: "typescript-interface"
title: "LlmPlanRequest"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/llm-planner.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/llm-planner.ts"
    symbol: "LlmPlanRequest"
    line_start: "10"
    line_end: "15"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.llm-planner.llmplanrequest` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.llm-planner.llmplanrequest is the canonical typescript-interface named LlmPlanRequest.

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

The symbol is exported across its module boundary as `LlmPlanRequest`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/llm-planner.ts:10-15` — LlmPlanRequest

## Related Knowledge

- `belongs-to` → `project.backend`
