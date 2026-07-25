---
id: 'component.frontend.frontend.src.components.operator.consegnepage.consegnepage'
kind: 'typescript-react-component'
title: 'ConsegnePage'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/ConsegnePage.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/ConsegnePage.tsx'
    symbol: 'ConsegnePage'
    line_start: '54'
    line_end: '324'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/ConsegnePage.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.consegnepage.consegnepage` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.consegnepage.consegnepage is the canonical typescript-react-component named ConsegnePage.

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

The symbol is exported across its module boundary as `ConsegnePage`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/ConsegnePage.tsx:54-324` — ConsegnePage

## Related Knowledge

- `belongs-to` → `project.frontend`
