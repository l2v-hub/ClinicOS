---
id: 'component.backend.backend.src.ai.gateway.query.dsl.rawfilter'
kind: 'typescript-interface'
title: 'RawFilter'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/query/dsl.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/query/dsl.ts'
    symbol: 'RawFilter'
    line_start: '8'
    line_end: '12'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.rawfilter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.rawfilter is the canonical typescript-interface named RawFilter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/query/patient-scope.ts`
- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `RawFilter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:8-12` — RawFilter

## Related Knowledge

- `belongs-to` → `project.backend`
