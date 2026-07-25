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
    target: "project.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
