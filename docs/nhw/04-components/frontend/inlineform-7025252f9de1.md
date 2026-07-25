---
id: 'component.frontend.frontend.src.components.operator.cartella.shared.inlineform'
kind: 'typescript-react-component'
title: 'InlineForm'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/cartella/shared.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/shared.tsx'
    symbol: 'InlineForm'
    line_start: '95'
    line_end: '128'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.inlineform` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.inlineform is the canonical typescript-react-component named InlineForm.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `InlineForm`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:95-128` — InlineForm

## Related Knowledge

- `belongs-to` → `project.frontend`
