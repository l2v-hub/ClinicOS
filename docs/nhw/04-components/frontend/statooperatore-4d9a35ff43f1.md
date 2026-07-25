---
id: 'component.frontend.frontend.src.types.statooperatore'
kind: 'typescript-type-alias'
title: 'StatoOperatore'
status: 'observed'
summary: 'Exported type-alias from frontend/src/types.ts.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'StatoOperatore'
    line_start: '99'
    line_end: '99'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'type-alias'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.types.statooperatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.statooperatore is the canonical typescript-type-alias named StatoOperatore.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/OperatorManagement.tsx`

## Invariants

The symbol is exported across its module boundary as `StatoOperatore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:99-99` — StatoOperatore

## Related Knowledge

- `belongs-to` → `project.frontend`
