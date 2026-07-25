---
id: 'component.backend.backend.src.lib.therapy-dose.scheduledoselabel'
kind: 'typescript-function'
title: 'scheduleDoseLabel'
status: 'observed'
summary: 'Exported function from backend/src/lib/therapy-dose.ts.'
bounded_contexts:
  - 'context.therapy-administration'
sources:
  - path: 'backend/src/lib/therapy-dose.ts'
    symbol: 'scheduleDoseLabel'
    line_start: '68'
    line_end: '83'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/lib/therapy-dose.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.scheduledoselabel` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.scheduledoselabel is the canonical typescript-function named scheduleDoseLabel.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/therapy-dose.test.ts`
- `backend/src/routes/therapy.ts`

## Invariants

The symbol is exported across its module boundary as `scheduleDoseLabel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:68-83` — scheduleDoseLabel

## Related Knowledge

- `belongs-to` → `project.backend`
