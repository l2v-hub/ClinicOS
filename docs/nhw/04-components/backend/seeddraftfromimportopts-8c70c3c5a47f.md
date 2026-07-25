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
    target: "project.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
