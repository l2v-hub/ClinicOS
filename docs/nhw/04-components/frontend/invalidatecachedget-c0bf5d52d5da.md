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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
