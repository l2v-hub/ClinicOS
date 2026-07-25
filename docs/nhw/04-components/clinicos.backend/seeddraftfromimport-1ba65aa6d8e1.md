---
id: "component.backend.backend.src.intake.draft-service.seeddraftfromimport"
kind: "typescript-function"
title: "seedDraftFromImport"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "seedDraftFromImport"
    line_start: "196"
    line_end: "237"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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

Owning project: `project.clinicos.backend`.

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

- `belongs-to` → `project.clinicos.backend`
