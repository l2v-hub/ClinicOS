---
id: 'component.frontend.frontend.src.lib.cachedfetch.cachedgetjson'
kind: 'typescript-function'
title: 'cachedGetJson'
status: 'observed'
summary: 'Exported function from frontend/src/lib/cachedFetch.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/lib/cachedFetch.ts'
    symbol: 'cachedGetJson'
    line_start: '11'
    line_end: '28'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/lib/cachedFetch.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.lib.cachedfetch.cachedgetjson` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.cachedfetch.cachedgetjson is the canonical typescript-function named cachedGetJson.

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
- `frontend/src/components/operator/InvioPSModal.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/components/shared/AIImportStatus.tsx`

## Invariants

The symbol is exported across its module boundary as `cachedGetJson`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/cachedFetch.ts:11-28` — cachedGetJson

## Related Knowledge

- `belongs-to` → `project.frontend`
