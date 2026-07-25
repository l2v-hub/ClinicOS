---
id: 'component.frontend.frontend.src.components.operator.cartella.shared.printbutton'
kind: 'typescript-react-component'
title: 'PrintButton'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/cartella/shared.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/shared.tsx'
    symbol: 'PrintButton'
    line_start: '31'
    line_end: '55'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/shared.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.printbutton` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.printbutton is the canonical typescript-react-component named PrintButton.

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
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`
- `frontend/src/components/operator/cartella/DocumentiTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`

## Invariants

The symbol is exported across its module boundary as `PrintButton`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:31-55` — PrintButton

## Related Knowledge

- `belongs-to` → `project.frontend`
