---
id: 'component.backend.backend.src.ai.merge.mergedlist'
kind: 'typescript-interface'
title: 'MergedList'
status: 'observed'
summary: 'Exported interface from backend/src/ai/merge.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/merge.ts'
    symbol: 'MergedList'
    line_start: '47'
    line_end: '51'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/merge.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergedlist` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergedlist is the canonical typescript-interface named MergedList.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/merge.test.ts`

## Invariants

The symbol is exported across its module boundary as `MergedList`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:47-51` — MergedList

## Related Knowledge

- `belongs-to` → `project.backend`
