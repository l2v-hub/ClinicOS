---
id: 'component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodal'
kind: 'typescript-react-component'
title: 'InvioPSModal'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/InvioPSModal.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/InvioPSModal.tsx'
    symbol: 'InvioPSModal'
    line_start: '209'
    line_end: '504'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/InvioPSModal.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodal is the canonical typescript-react-component named InvioPSModal.

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

The symbol is exported across its module boundary as `InvioPSModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:209-504` — InvioPSModal

## Related Knowledge

- `belongs-to` → `project.frontend`
