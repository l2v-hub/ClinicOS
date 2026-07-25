---
id: 'component.frontend.frontend.src.components.operator.operatordashboard.operatordashboard'
kind: 'typescript-react-component'
title: 'OperatorDashboard'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/OperatorDashboard.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/OperatorDashboard.tsx'
    symbol: 'OperatorDashboard'
    line_start: '38'
    line_end: '394'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/OperatorDashboard.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.operatordashboard.operatordashboard` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.operatordashboard.operatordashboard is the canonical typescript-react-component named OperatorDashboard.

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

## Invariants

The symbol is exported across its module boundary as `OperatorDashboard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/OperatorDashboard.tsx:38-394` — OperatorDashboard

## Related Knowledge

- `belongs-to` → `project.frontend`
