---
id: 'component.frontend.frontend.src.types.liberatoria'
kind: 'typescript-interface'
title: 'Liberatoria'
status: 'observed'
summary: 'Exported interface from frontend/src/types.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'Liberatoria'
    line_start: '902'
    line_end: '918'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.types.liberatoria` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.liberatoria is the canonical typescript-interface named Liberatoria.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DimissioneTab.tsx`

## Invariants

The symbol is exported across its module boundary as `Liberatoria`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:902-918` — Liberatoria

## Related Knowledge

- `belongs-to` → `project.frontend`
