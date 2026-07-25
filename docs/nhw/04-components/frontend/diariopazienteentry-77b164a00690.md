---
id: 'component.frontend.frontend.src.types.diariopazienteentry'
kind: 'typescript-interface'
title: 'DiarioPazienteEntry'
status: 'observed'
summary: 'Exported interface from frontend/src/types.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'DiarioPazienteEntry'
    line_start: '622'
    line_end: '635'
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

What does `component.frontend.frontend.src.types.diariopazienteentry` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.diariopazienteentry is the canonical typescript-interface named DiarioPazienteEntry.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DiarioPazienteEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:622-635` — DiarioPazienteEntry

## Related Knowledge

- `belongs-to` → `project.frontend`
