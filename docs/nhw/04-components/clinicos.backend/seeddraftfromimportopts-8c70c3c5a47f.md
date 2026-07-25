---
id: "component.backend.backend.src.intake.draft-service.seeddraftfromimportopts"
kind: "typescript-interface"
title: "SeedDraftFromImportOpts"
status: "observed"
summary: "Exported interface from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "SeedDraftFromImportOpts"
    line_start: "87"
    line_end: "89"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.seeddraftfromimportopts` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.seeddraftfromimportopts is the canonical typescript-interface named SeedDraftFromImportOpts.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `SeedDraftFromImportOpts`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:87-89` — SeedDraftFromImportOpts

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
