---
id: 'component.frontend.frontend.src.components.admin.roomsmanagement.roomsmanagement'
kind: 'typescript-react-component'
title: 'RoomsManagement'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/admin/RoomsManagement.tsx.'
bounded_contexts:
  - 'context.facility-occupancy'
sources:
  - path: 'frontend/src/components/admin/RoomsManagement.tsx'
    symbol: 'RoomsManagement'
    line_start: '93'
    line_end: '605'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/admin/RoomsManagement.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.roomsmanagement.roomsmanagement` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.roomsmanagement.roomsmanagement is the canonical typescript-react-component named RoomsManagement.

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

The symbol is exported across its module boundary as `RoomsManagement`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/RoomsManagement.tsx:93-605` — RoomsManagement

## Related Knowledge

- `belongs-to` → `project.frontend`
