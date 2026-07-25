---
id: "component.backend.backend.src.ai.assistant.plan.plancontext"
kind: "typescript-interface"
title: "PlanContext"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "PlanContext"
    line_start: "104"
    line_end: "109"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.plancontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.plancontext is the canonical typescript-interface named PlanContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/llm-planner.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `PlanContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:104-109` — PlanContext

## Related Knowledge

- `belongs-to` → `project.backend`
