---
id: 'component.backend.backend.src.ai.assistant.agents.owneragent'
kind: 'typescript-function'
title: 'ownerAgent'
status: 'observed'
summary: 'Exported function from backend/src/ai/assistant/agents.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/assistant/agents.ts'
    symbol: 'ownerAgent'
    line_start: '70'
    line_end: '74'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/agents.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.agents.owneragent` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.agents.owneragent is the canonical typescript-function named ownerAgent.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/agents.test.ts`
- `backend/src/ai/__tests__/staff-list.test.ts`

## Invariants

The symbol is exported across its module boundary as `ownerAgent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/agents.ts:70-74` — ownerAgent

## Related Knowledge

- `belongs-to` → `project.backend`
