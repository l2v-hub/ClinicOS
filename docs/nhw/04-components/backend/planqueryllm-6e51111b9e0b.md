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
    target: "project.backend"
    evidence: "backend/src/ai/assistant/llm-planner.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
