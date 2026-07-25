---
id: 'component.frontend.frontend.src.components.shared.intake.stepanagrafica.stepanagrafica'
kind: 'typescript-react-component'
title: 'StepAnagrafica'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/shared/intake/StepAnagrafica.tsx.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'frontend/src/components/shared/intake/StepAnagrafica.tsx'
    symbol: 'StepAnagrafica'
    line_start: '93'
    line_end: '307'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/intake/StepAnagrafica.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.stepanagrafica.stepanagrafica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.stepanagrafica.stepanagrafica is the canonical typescript-react-component named StepAnagrafica.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`

## Invariants

The symbol is exported across its module boundary as `StepAnagrafica`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/StepAnagrafica.tsx:93-307` — StepAnagrafica

## Related Knowledge

- `belongs-to` → `project.frontend`
