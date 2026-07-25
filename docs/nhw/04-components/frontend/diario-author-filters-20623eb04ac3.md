---
id: 'component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diario-author-filters'
kind: 'typescript-constant'
title: 'DIARIO_AUTHOR_FILTERS'
status: 'observed'
summary: 'Exported constant from frontend/src/components/operator/cartella/DiarioPazienteTab.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/DiarioPazienteTab.tsx'
    symbol: 'DIARIO_AUTHOR_FILTERS'
    line_start: '51'
    line_end: '59'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/DiarioPazienteTab.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diario-author-filters` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diario-author-filters is the canonical typescript-constant named DIARIO_AUTHOR_FILTERS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `DIARIO_AUTHOR_FILTERS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx:51-59` — DIARIO_AUTHOR_FILTERS

## Related Knowledge

- `belongs-to` → `project.frontend`
