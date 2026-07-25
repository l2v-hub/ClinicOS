---
id: "component.backend.backend.src.ai.assistant.plan.queryplan"
kind: "typescript-interface"
title: "QueryPlan"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "QueryPlan"
    line_start: "31"
    line_end: "38"
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

What does `component.backend.backend.src.ai.assistant.plan.queryplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.queryplan is the canonical typescript-interface named QueryPlan.

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

The symbol is exported across its module boundary as `QueryPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:31-38` — QueryPlan

## Related Knowledge

- `belongs-to` → `project.backend`
