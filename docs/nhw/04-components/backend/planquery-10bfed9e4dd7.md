---
id: "component.backend.backend.src.ai.assistant.plan.planquery"
kind: "typescript-function"
title: "planQuery"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "planQuery"
    line_start: "112"
    line_end: "254"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.planquery` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.planquery is the canonical typescript-function named planQuery.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/assistant-plan.test.ts`
- `backend/src/ai/__tests__/staff-list.test.ts`
- `backend/src/ai/__tests__/vitals-trend.test.ts`
- `backend/src/ai/assistant/llm-planner.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `planQuery`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:112-254` — planQuery

## Related Knowledge

- `belongs-to` → `project.backend`
