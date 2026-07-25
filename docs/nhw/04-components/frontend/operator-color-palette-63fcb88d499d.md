---
id: 'component.frontend.frontend.src.types.operator-color-palette'
kind: 'typescript-constant'
title: 'OPERATOR_COLOR_PALETTE'
status: 'observed'
summary: 'Exported constant from frontend/src/types.ts.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/types.ts'
    symbol: 'OPERATOR_COLOR_PALETTE'
    line_start: '102'
    line_end: '113'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.types.operator-color-palette` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.operator-color-palette is the canonical typescript-constant named OPERATOR_COLOR_PALETTE.

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
- `frontend/src/components/admin/OperatorManagement.tsx`

## Invariants

The symbol is exported across its module boundary as `OPERATOR_COLOR_PALETTE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:102-113` — OPERATOR_COLOR_PALETTE

## Related Knowledge

- `belongs-to` → `project.frontend`
