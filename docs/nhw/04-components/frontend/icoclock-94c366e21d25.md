---
id: 'component.frontend.frontend.src.icons.icoclock'
kind: 'typescript-react-component'
title: 'IcoClock'
status: 'observed'
summary: 'Exported react-component from frontend/src/icons.tsx.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/icons.tsx'
    symbol: 'IcoClock'
    line_start: '477'
    line_end: '489'
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

What does `component.frontend.frontend.src.icons.icoclock` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoclock is the canonical typescript-react-component named IcoClock.

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
- `frontend/src/components/admin/OperatorSchedule.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/shared/TeamsLikeSidebar.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoClock`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:477-489` — IcoClock

## Related Knowledge

- `belongs-to` → `project.frontend`
