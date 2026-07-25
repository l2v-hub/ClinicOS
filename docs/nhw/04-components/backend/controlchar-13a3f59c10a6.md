---
id: 'component.backend.backend.src.lib.codice-fiscale.controlchar'
kind: 'typescript-function'
title: 'controlChar'
status: 'observed'
summary: 'Exported function from backend/src/lib/codice-fiscale.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/lib/codice-fiscale.ts'
    symbol: 'controlChar'
    line_start: '92'
    line_end: '99'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/lib/codice-fiscale.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.lib.codice-fiscale.controlchar` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.codice-fiscale.controlchar is the canonical typescript-function named controlChar.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/codice-fiscale.test.ts`

## Invariants

The symbol is exported across its module boundary as `controlChar`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/codice-fiscale.ts:92-99` — controlChar

## Related Knowledge

- `belongs-to` → `project.backend`
