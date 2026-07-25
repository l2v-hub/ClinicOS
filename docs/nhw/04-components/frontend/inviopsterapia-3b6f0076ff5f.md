---
id: 'component.frontend.frontend.src.components.operator.inviopsmodal.inviopsterapia'
kind: 'typescript-interface'
title: 'InvioPSTerapia'
status: 'observed'
summary: 'Exported interface from frontend/src/components/operator/InvioPSModal.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/InvioPSModal.tsx'
    symbol: 'InvioPSTerapia'
    line_start: '56'
    line_end: '63'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/InvioPSModal.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.inviopsterapia` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.inviopsterapia is the canonical typescript-interface named InvioPSTerapia.

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

The symbol is exported across its module boundary as `InvioPSTerapia`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:56-63` — InvioPSTerapia

## Related Knowledge

- `belongs-to` → `project.frontend`
