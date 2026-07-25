---
id: 'component.frontend.frontend.src.components.operator.cartella.scalatinettitab.scalatinettitab'
kind: 'typescript-react-component'
title: 'ScalaTinettiTab'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/cartella/ScalaTinettiTab.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/ScalaTinettiTab.tsx'
    symbol: 'ScalaTinettiTab'
    line_start: '608'
    line_end: '838'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/ScalaTinettiTab.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.scalatinettitab.scalatinettitab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalatinettitab.scalatinettitab is the canonical typescript-react-component named ScalaTinettiTab.

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

The symbol is exported across its module boundary as `ScalaTinettiTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:608-838` — ScalaTinettiTab

## Related Knowledge

- `belongs-to` → `project.frontend`
