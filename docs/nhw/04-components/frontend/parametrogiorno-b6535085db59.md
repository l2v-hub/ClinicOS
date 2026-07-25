---
id: 'component.frontend.frontend.src.types.parametrogiorno'
kind: 'typescript-interface'
title: 'ParametroGiorno'
status: 'observed'
summary: 'Exported interface from frontend/src/types.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'ParametroGiorno'
    line_start: '637'
    line_end: '651'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.types.parametrogiorno` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.parametrogiorno is the canonical typescript-interface named ParametroGiorno.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/MultiPatientParametri.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/VitaleModal.tsx`

## Invariants

The symbol is exported across its module boundary as `ParametroGiorno`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:637-651` — ParametroGiorno

## Related Knowledge

- `belongs-to` → `project.frontend`
