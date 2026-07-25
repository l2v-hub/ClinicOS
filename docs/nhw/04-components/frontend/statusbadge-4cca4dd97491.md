---
id: 'component.frontend.frontend.src.components.shared.statusbadge.statusbadge'
kind: 'typescript-react-component'
title: 'StatusBadge'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/shared/StatusBadge.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/components/shared/StatusBadge.tsx'
    symbol: 'StatusBadge'
    line_start: '19'
    line_end: '22'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/StatusBadge.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.statusbadge.statusbadge` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.statusbadge.statusbadge is the canonical typescript-react-component named StatusBadge.

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

The symbol is exported across its module boundary as `StatusBadge`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/StatusBadge.tsx:19-22` — StatusBadge

## Related Knowledge

- `belongs-to` → `project.frontend`
