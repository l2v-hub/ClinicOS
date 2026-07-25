---
id: 'component.frontend.frontend.src.components.shared.intake.confirmcartella.buildconfirmcartella'
kind: 'typescript-function'
title: 'buildConfirmCartella'
status: 'observed'
summary: 'Exported function from frontend/src/components/shared/intake/confirmCartella.ts.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'frontend/src/components/shared/intake/confirmCartella.ts'
    symbol: 'buildConfirmCartella'
    line_start: '9'
    line_end: '40'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/intake/confirmCartella.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.confirmcartella.buildconfirmcartella` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.confirmcartella.buildconfirmcartella is the canonical typescript-function named buildConfirmCartella.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`
- `frontend/src/components/shared/intake/__tests__/confirmCartella.test.ts`

## Invariants

The symbol is exported across its module boundary as `buildConfirmCartella`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/confirmCartella.ts:9-40` — buildConfirmCartella

## Related Knowledge

- `belongs-to` → `project.frontend`
