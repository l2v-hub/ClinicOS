---
id: 'component.backend.backend.src.routes.patient-documents.router'
kind: 'typescript-constant'
title: 'router'
status: 'observed'
summary: 'Exported constant from backend/src/routes/patient-documents.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-documents.ts'
    symbol: 'router'
    line_start: '18'
    line_end: '18'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-documents.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.router` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.router is the canonical typescript-constant named router.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `router`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:18-18` — router

## Related Knowledge

- `belongs-to` → `project.backend`
