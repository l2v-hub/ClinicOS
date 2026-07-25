---
id: 'component.frontend.frontend.src.components.operator.therapyslotmodal.therapyslotmodal'
kind: 'typescript-react-component'
title: 'TherapySlotModal'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/TherapySlotModal.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/TherapySlotModal.tsx'
    symbol: 'TherapySlotModal'
    line_start: '46'
    line_end: '229'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/TherapySlotModal.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.therapyslotmodal.therapyslotmodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.therapyslotmodal.therapyslotmodal is the canonical typescript-react-component named TherapySlotModal.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/OperatorAgenda.tsx`

## Invariants

The symbol is exported across its module boundary as `TherapySlotModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/TherapySlotModal.tsx:46-229` — TherapySlotModal

## Related Knowledge

- `belongs-to` → `project.frontend`
