---
id: 'component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal'
kind: 'typescript-react-component'
title: 'VitaleModal'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/cartella/VitaleModal.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/VitaleModal.tsx'
    symbol: 'VitaleModal'
    line_start: '37'
    line_end: '311'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/VitaleModal.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal is the canonical typescript-react-component named VitaleModal.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `VitaleModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/VitaleModal.tsx:37-311` — VitaleModal

## Related Knowledge

- `belongs-to` → `project.frontend`
