---
id: 'component.frontend.frontend.src.types.essudatolivello'
kind: 'typescript-type-alias'
title: 'EssudatoLivello'
status: 'observed'
summary: 'Exported type-alias from frontend/src/types.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'EssudatoLivello'
    line_start: '663'
    line_end: '663'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.types.essudatolivello` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.essudatolivello is the canonical typescript-type-alias named EssudatoLivello.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`

## Invariants

The symbol is exported across its module boundary as `EssudatoLivello`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:663-663` — EssudatoLivello

## Related Knowledge

- `belongs-to` → `project.frontend`
