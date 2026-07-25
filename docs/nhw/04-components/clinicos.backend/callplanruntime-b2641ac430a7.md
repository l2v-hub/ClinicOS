---
id: "component.backend.backend.src.ai.assistant.runtime-client.callplanruntime"
kind: "typescript-function"
title: "callPlanRuntime"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/runtime-client.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/runtime-client.ts"
    symbol: "callPlanRuntime"
    line_start: "8"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/runtime-client.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.runtime-client.callplanruntime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.runtime-client.callplanruntime is the canonical typescript-function named callPlanRuntime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `callPlanRuntime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/runtime-client.ts:8-23` — callPlanRuntime

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
