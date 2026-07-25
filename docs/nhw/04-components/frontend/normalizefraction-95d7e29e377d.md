---
id: 'component.frontend.frontend.src.components.operator.cartella.therapydose.normalizefraction'
kind: 'typescript-function'
title: 'normalizeFraction'
status: 'observed'
summary: 'Exported function from frontend/src/components/operator/cartella/therapyDose.ts.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/therapyDose.ts'
    symbol: 'normalizeFraction'
    line_start: '55'
    line_end: '64'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/therapyDose.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.therapydose.normalizefraction` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.therapydose.normalizefraction is the canonical typescript-function named normalizeFraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `normalizeFraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/therapyDose.ts:55-64` — normalizeFraction

## Related Knowledge

- `belongs-to` → `project.frontend`
