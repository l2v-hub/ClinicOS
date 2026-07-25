---
id: 'component.frontend.frontend.src.icons.icouser'
kind: 'typescript-react-component'
title: 'IcoUser'
status: 'observed'
summary: 'Exported react-component from frontend/src/icons.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/icons.tsx'
    symbol: 'IcoUser'
    line_start: '298'
    line_end: '310'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/icons.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.icons.icouser` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icouser is the canonical typescript-react-component named IcoUser.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/Login.tsx`
- `frontend/src/components/operator/PatientList.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoUser`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:298-310` — IcoUser

## Related Knowledge

- `belongs-to` → `project.frontend`
