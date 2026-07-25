---
id: "component.backend.backend.src.intake.draft-service.buildimportdraftdata"
kind: "typescript-function"
title: "buildImportDraftData"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "buildImportDraftData"
    line_start: "102"
    line_end: "190"
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

What does `component.backend.backend.src.intake.draft-service.buildimportdraftdata` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.buildimportdraftdata is the canonical typescript-function named buildImportDraftData.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/intake/__tests__/seed-draft-from-import.test.ts`

## Invariants

The symbol is exported across its module boundary as `buildImportDraftData`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:102-190` — buildImportDraftData

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
