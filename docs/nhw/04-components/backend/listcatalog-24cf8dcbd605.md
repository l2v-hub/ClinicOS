---
id: 'component.backend.backend.src.ai.actions.catalog.listcatalog'
kind: 'typescript-function'
title: 'listCatalog'
status: 'observed'
summary: 'Exported function from backend/src/ai/actions/catalog.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/actions/catalog.ts'
    symbol: 'listCatalog'
    line_start: '104'
    line_end: '110'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/actions/catalog.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.listcatalog` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.listcatalog is the canonical typescript-function named listCatalog.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/routes/ai-actions.ts`

## Invariants

The symbol is exported across its module boundary as `listCatalog`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:104-110` — listCatalog

## Related Knowledge

- `belongs-to` → `project.backend`
