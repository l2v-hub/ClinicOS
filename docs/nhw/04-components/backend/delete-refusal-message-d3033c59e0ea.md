---
id: 'component.backend.backend.src.ai.voice.plan.delete-refusal-message'
kind: 'typescript-constant'
title: 'DELETE_REFUSAL_MESSAGE'
status: 'observed'
summary: 'Exported constant from backend/src/ai/voice/plan.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/voice/plan.ts'
    symbol: 'DELETE_REFUSAL_MESSAGE'
    line_start: '23'
    line_end: '24'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/voice/plan.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.voice.plan.delete-refusal-message` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.plan.delete-refusal-message is the canonical typescript-constant named DELETE_REFUSAL_MESSAGE.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `DELETE_REFUSAL_MESSAGE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/plan.ts:23-24` — DELETE_REFUSAL_MESSAGE

## Related Knowledge

- `belongs-to` → `project.backend`
