---
id: 'component.frontend.frontend.src.icons.icopill'
kind: 'typescript-react-component'
title: 'IcoPill'
status: 'observed'
summary: 'Exported react-component from frontend/src/icons.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/icons.tsx'
    symbol: 'IcoPill'
    line_start: '190'
    line_end: '208'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.icons.icopill` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icopill is the canonical typescript-react-component named IcoPill.

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
- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoPill`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:190-208` — IcoPill

## Related Knowledge

- `belongs-to` → `project.frontend`
