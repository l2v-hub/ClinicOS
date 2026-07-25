---
id: "component.backend.backend.src.ai.assistant.plan.plannedtoolcall"
kind: "typescript-interface"
title: "PlannedToolCall"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/plan.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/plan.ts"
    symbol: "PlannedToolCall"
    line_start: "26"
    line_end: "29"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.plannedtoolcall` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.plannedtoolcall is the canonical typescript-interface named PlannedToolCall.

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

The symbol is exported across its module boundary as `PlannedToolCall`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:26-29` — PlannedToolCall

## Related Knowledge

- `belongs-to` → `project.backend`
