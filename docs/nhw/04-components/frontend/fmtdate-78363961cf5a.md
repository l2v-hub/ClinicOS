---
id: 'component.frontend.frontend.src.components.operator.cartella.shared.fmtdate'
kind: 'typescript-function'
title: 'fmtDate'
status: 'observed'
summary: 'Exported function from frontend/src/components/operator/cartella/shared.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/shared.tsx'
    symbol: 'fmtDate'
    line_start: '17'
    line_end: '20'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/shared.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.fmtdate` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.fmtdate is the canonical typescript-function named fmtDate.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`
- `frontend/src/components/operator/cartella/DocumentiTab.tsx`
- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `fmtDate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:17-20` — fmtDate

## Related Knowledge

- `belongs-to` → `project.frontend`
