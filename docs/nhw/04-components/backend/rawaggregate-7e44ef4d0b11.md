---
id: 'component.backend.backend.src.ai.gateway.query.dsl.rawaggregate'
kind: 'typescript-interface'
title: 'RawAggregate'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/query/dsl.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/query/dsl.ts'
    symbol: 'RawAggregate'
    line_start: '14'
    line_end: '18'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/query/dsl.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.rawaggregate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.rawaggregate is the canonical typescript-interface named RawAggregate.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `RawAggregate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:14-18` — RawAggregate

## Related Knowledge

- `belongs-to` → `project.backend`
