---
id: 'component.frontend.frontend.src.types.therapyslot'
kind: 'typescript-interface'
title: 'TherapySlot'
status: 'observed'
summary: 'Exported interface from frontend/src/types.ts.'
bounded_contexts:
  - 'context.therapy-administration'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'TherapySlot'
    line_start: '964'
    line_end: '971'
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

What does `component.frontend.frontend.src.types.therapyslot` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.therapyslot is the canonical typescript-interface named TherapySlot.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/TherapySlotModal.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `TherapySlot`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:964-971` — TherapySlot

## Related Knowledge

- `belongs-to` → `project.frontend`
