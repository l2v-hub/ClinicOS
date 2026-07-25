---
id: 'component.frontend.frontend.src.app.app'
kind: 'typescript-react-component'
title: 'App'
status: 'observed'
summary: 'Exported react-component from frontend/src/App.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/App.tsx'
    symbol: 'App'
    line_start: '130'
    line_end: '1597'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/App.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.app.app` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.app.app is the canonical typescript-react-component named App.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/main.tsx`

## Invariants

The symbol is exported across its module boundary as `App`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/App.tsx:130-1597` — App

## Related Knowledge

- `belongs-to` → `project.frontend`
