---
id: 'component.backend.backend.src.intake.draft-service.seeddraftfromimport'
kind: 'typescript-function'
title: 'seedDraftFromImport'
status: 'observed'
summary: 'Exported function from backend/src/intake/draft-service.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/intake/draft-service.ts'
    symbol: 'seedDraftFromImport'
    line_start: '196'
    line_end: '237'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/intake/draft-service.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.seeddraftfromimport` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.seeddraftfromimport is the canonical typescript-function named seedDraftFromImport.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/intake/__tests__/confirm-draft-guards.test.ts`
- `backend/src/intake/__tests__/seed-draft-from-import.test.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `seedDraftFromImport`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:196-237` — seedDraftFromImport

## Related Knowledge

- `belongs-to` → `project.backend`
