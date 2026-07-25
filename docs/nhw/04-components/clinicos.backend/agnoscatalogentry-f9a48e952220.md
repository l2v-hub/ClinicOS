---
id: "component.backend.backend.src.ai.actions.catalog.agnoscatalogentry"
kind: "typescript-interface"
title: "AgnosCatalogEntry"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/catalog.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/actions/catalog.ts"
    symbol: "AgnosCatalogEntry"
    line_start: "10"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/catalog.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.agnoscatalogentry` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.agnoscatalogentry is the canonical typescript-interface named AgnosCatalogEntry.

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

The symbol is exported across its module boundary as `AgnosCatalogEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:10-16` — AgnosCatalogEntry

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
