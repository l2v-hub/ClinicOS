---
id: 'component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal'
kind: 'typescript-react-component'
title: 'NewPatientModal'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/shared/NewPatientModal.tsx.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'frontend/src/components/shared/NewPatientModal.tsx'
    symbol: 'NewPatientModal'
    line_start: '141'
    line_end: '939'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/NewPatientModal.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.newpatientmodal.newpatientmodal is the canonical typescript-react-component named NewPatientModal.

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

The symbol is exported across its module boundary as `NewPatientModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NewPatientModal.tsx:141-939` — NewPatientModal

## Related Knowledge

- `belongs-to` → `project.frontend`
