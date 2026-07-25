---
id: "component.backend.backend.src.ai.actions.orchestrate.plancommandresult"
kind: "typescript-interface"
title: "PlanCommandResult"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/orchestrate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "PlanCommandResult"
    line_start: "99"
    line_end: "103"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/orchestrate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.orchestrate.plancommandresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.orchestrate.plancommandresult is the canonical typescript-interface named PlanCommandResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PlanCommandResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/orchestrate.ts:99-103` — PlanCommandResult

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
