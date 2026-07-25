---
id: 'component.frontend.frontend.src.types.tipocontenzione'
kind: 'typescript-type-alias'
title: 'TipoContenzione'
status: 'observed'
summary: 'Exported type-alias from frontend/src/types.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'TipoContenzione'
    line_start: '699'
    line_end: '699'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'type-alias'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.types.tipocontenzione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.tipocontenzione is the canonical typescript-type-alias named TipoContenzione.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`

## Invariants

The symbol is exported across its module boundary as `TipoContenzione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:699-699` — TipoContenzione

## Related Knowledge

- `belongs-to` → `project.frontend`
