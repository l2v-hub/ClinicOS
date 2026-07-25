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
    target: "project.backend"
    evidence: "backend/src/ai/actions/catalog.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
