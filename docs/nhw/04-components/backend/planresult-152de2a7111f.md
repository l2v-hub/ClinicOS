---
id: 'component.backend.backend.src.ai.assistant.llm-planner.planresult'
kind: 'typescript-interface'
title: 'PlanResult'
status: 'observed'
summary: 'Exported interface from backend/src/ai/assistant/llm-planner.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/assistant/llm-planner.ts'
    symbol: 'PlanResult'
    line_start: '27'
    line_end: '30'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/llm-planner.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.llm-planner.planresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.llm-planner.planresult is the canonical typescript-interface named PlanResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PlanResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/llm-planner.ts:27-30` — PlanResult

## Related Knowledge

- `belongs-to` → `project.backend`
