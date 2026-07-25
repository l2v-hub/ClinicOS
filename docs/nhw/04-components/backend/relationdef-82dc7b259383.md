---
id: 'component.backend.backend.src.ai.gateway.query.schema.relationdef'
kind: 'typescript-interface'
title: 'RelationDef'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/query/schema.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/query/schema.ts'
    symbol: 'RelationDef'
    line_start: '19'
    line_end: '22'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/query/schema.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.relationdef` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.relationdef is the canonical typescript-interface named RelationDef.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `RelationDef`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:19-22` — RelationDef

## Related Knowledge

- `belongs-to` → `project.backend`
