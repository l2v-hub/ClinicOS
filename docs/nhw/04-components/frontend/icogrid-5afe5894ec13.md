---
id: 'component.frontend.frontend.src.icons.icogrid'
kind: 'typescript-react-component'
title: 'IcoGrid'
status: 'observed'
summary: 'Exported react-component from frontend/src/icons.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/icons.tsx'
    symbol: 'IcoGrid'
    line_start: '503'
    line_end: '517'
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

What does `component.frontend.frontend.src.icons.icogrid` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icogrid is the canonical typescript-react-component named IcoGrid.

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

The symbol is exported across its module boundary as `IcoGrid`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:503-517` — IcoGrid

## Related Knowledge

- `belongs-to` → `project.frontend`
