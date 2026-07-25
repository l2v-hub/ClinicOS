---
id: 'component.backend.backend.src.ai.actions.consegne.isconsegnaaction'
kind: 'typescript-function'
title: 'isConsegnaAction'
status: 'observed'
summary: 'Exported function from backend/src/ai/actions/consegne.ts.'
bounded_contexts:
  - 'context.operator-collaboration'
sources:
  - path: 'backend/src/ai/actions/consegne.ts'
    symbol: 'isConsegnaAction'
    line_start: '19'
    line_end: '21'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/actions/consegne.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.actions.consegne.isconsegnaaction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.consegne.isconsegnaaction is the canonical typescript-function named isConsegnaAction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `isConsegnaAction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/consegne.ts:19-21` — isConsegnaAction

## Related Knowledge

- `belongs-to` → `project.backend`
