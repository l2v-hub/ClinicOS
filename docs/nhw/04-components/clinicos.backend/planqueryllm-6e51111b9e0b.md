---
id: "component.backend.backend.src.ai.assistant.llm-planner.planqueryllm"
kind: "typescript-function"
title: "planQueryLLM"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/llm-planner.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/llm-planner.ts"
    symbol: "planQueryLLM"
    line_start: "107"
    line_end: "132"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/llm-planner.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.llm-planner.planqueryllm` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.llm-planner.planqueryllm is the canonical typescript-function named planQueryLLM.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/llm-planner.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `planQueryLLM`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/llm-planner.ts:107-132` — planQueryLLM

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
