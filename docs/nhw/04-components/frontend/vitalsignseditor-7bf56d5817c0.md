---
id: 'component.frontend.frontend.src.components.operator.sections.vitalsignseditor.vitalsignseditor'
kind: 'typescript-react-component'
title: 'VitalSignsEditor'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/sections/VitalSignsEditor.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/sections/VitalSignsEditor.tsx'
    symbol: 'VitalSignsEditor'
    line_start: '28'
    line_end: '76'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/sections/VitalSignsEditor.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.vitalsignseditor.vitalsignseditor` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.vitalsignseditor.vitalsignseditor is the canonical typescript-react-component named VitalSignsEditor.

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
- `frontend/src/components/operator/sections/patientSections.ts`

## Invariants

The symbol is exported across its module boundary as `VitalSignsEditor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/VitalSignsEditor.tsx:28-76` — VitalSignsEditor

## Related Knowledge

- `belongs-to` → `project.frontend`
