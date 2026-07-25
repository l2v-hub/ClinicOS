---
id: 'component.backend.backend.src.ai.assistant.runtime-client.callplanruntime'
kind: 'typescript-function'
title: 'callPlanRuntime'
status: 'observed'
summary: 'Exported function from backend/src/ai/assistant/runtime-client.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/assistant/runtime-client.ts'
    symbol: 'callPlanRuntime'
    line_start: '8'
    line_end: '23'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/runtime-client.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
