---
id: 'component.frontend.frontend.src.types.scheduleoperatore'
kind: 'typescript-interface'
title: 'ScheduleOperatore'
status: 'observed'
summary: 'Exported interface from frontend/src/types.ts.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'ScheduleOperatore'
    line_start: '244'
    line_end: '249'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.types.scheduleoperatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.scheduleoperatore is the canonical typescript-interface named ScheduleOperatore.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/admin/OperatorSchedule.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `ScheduleOperatore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:244-249` — ScheduleOperatore

## Related Knowledge

- `belongs-to` → `project.frontend`
