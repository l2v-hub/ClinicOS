---
id: "component.frontend.frontend.src.lib.cachedfetch.invalidatecachedget"
kind: "typescript-function"
title: "invalidateCachedGet"
status: "observed"
summary: "Exported function from frontend/src/lib/cachedFetch.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/cachedFetch.ts"
    symbol: "invalidateCachedGet"
    line_start: "31"
    line_end: "33"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/cachedFetch.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.lib.cachedfetch.invalidatecachedget` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.cachedfetch.invalidatecachedget is the canonical typescript-function named invalidateCachedGet.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`

## Invariants

The symbol is exported across its module boundary as `invalidateCachedGet`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/cachedFetch.ts:31-33` — invalidateCachedGet

## Related Knowledge

- `belongs-to` → `project.frontend`
