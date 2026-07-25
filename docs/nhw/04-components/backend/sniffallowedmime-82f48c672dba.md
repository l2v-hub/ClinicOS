---
id: 'component.backend.backend.src.routes.patient-documents.sniffallowedmime'
kind: 'typescript-function'
title: 'sniffAllowedMime'
status: 'observed'
summary: 'Exported function from backend/src/routes/patient-documents.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/routes/patient-documents.ts'
    symbol: 'sniffAllowedMime'
    line_start: '121'
    line_end: '150'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/patient-documents.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.sniffallowedmime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.sniffallowedmime is the canonical typescript-function named sniffAllowedMime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-documents-security.test.ts`

## Invariants

The symbol is exported across its module boundary as `sniffAllowedMime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:121-150` — sniffAllowedMime

## Related Knowledge

- `belongs-to` → `project.backend`
