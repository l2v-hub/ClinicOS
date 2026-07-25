---
id: 'component.frontend.frontend.src.icons.icoshield'
kind: 'typescript-react-component'
title: 'IcoShield'
status: 'observed'
summary: 'Exported react-component from frontend/src/icons.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/icons.tsx'
    symbol: 'IcoShield'
    line_start: '209'
    line_end: '220'
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

What does `component.frontend.frontend.src.icons.icoshield` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoshield is the canonical typescript-react-component named IcoShield.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoShield`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:209-220` — IcoShield

## Related Knowledge

- `belongs-to` → `project.frontend`
