---
id: 'component.frontend.frontend.src.components.operator.cartella.shared.uid'
kind: 'typescript-function'
title: 'uid'
status: 'observed'
summary: 'Exported function from frontend/src/components/operator/cartella/shared.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/shared.tsx'
    symbol: 'uid'
    line_start: '4'
    line_end: '6'
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

What does `component.frontend.frontend.src.components.operator.cartella.shared.uid` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.uid is the canonical typescript-function named uid.

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
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`
- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `uid`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:4-6` — uid

## Related Knowledge

- `belongs-to` → `project.frontend`
