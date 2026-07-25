---
id: 'component.backend.backend.src.ai.voice.execute.executeaction'
kind: 'typescript-function'
title: 'executeAction'
status: 'observed'
summary: 'Exported function from backend/src/ai/voice/execute.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/voice/execute.ts'
    symbol: 'executeAction'
    line_start: '107'
    line_end: '212'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/voice/execute.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.voice.execute.executeaction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.execute.executeaction is the canonical typescript-function named executeAction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `executeAction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/execute.ts:107-212` — executeAction

## Related Knowledge

- `belongs-to` → `project.backend`
