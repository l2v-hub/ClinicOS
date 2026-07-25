---
id: 'component.backend.backend.src.ai.gateway.filters.vitalitem'
kind: 'typescript-interface'
title: 'VitalItem'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/filters.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/filters.ts'
    symbol: 'VitalItem'
    line_start: '40'
    line_end: '47'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/filters.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.vitalitem` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.vitalitem is the canonical typescript-interface named VitalItem.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `VitalItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:40-47` — VitalItem

## Related Knowledge

- `belongs-to` → `project.backend`
