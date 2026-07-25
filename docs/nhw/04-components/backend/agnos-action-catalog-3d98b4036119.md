---
id: 'component.backend.backend.src.ai.actions.catalog.agnos-action-catalog'
kind: 'typescript-constant'
title: 'AGNOS_ACTION_CATALOG'
status: 'observed'
summary: 'Exported constant from backend/src/ai/actions/catalog.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/actions/catalog.ts'
    symbol: 'AGNOS_ACTION_CATALOG'
    line_start: '18'
    line_end: '85'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/actions/catalog.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.agnos-action-catalog` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.agnos-action-catalog is the canonical typescript-constant named AGNOS_ACTION_CATALOG.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/voice/audit.ts`

## Invariants

The symbol is exported across its module boundary as `AGNOS_ACTION_CATALOG`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:18-85` — AGNOS_ACTION_CATALOG

## Related Knowledge

- `belongs-to` → `project.backend`
