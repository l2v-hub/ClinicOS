---
id: 'component.frontend.frontend.src.lib.legacyanamnesis.haslegacyanamnesis'
kind: 'typescript-function'
title: 'hasLegacyAnamnesis'
status: 'observed'
summary: 'Exported function from frontend/src/lib/legacyAnamnesis.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/lib/legacyAnamnesis.ts'
    symbol: 'hasLegacyAnamnesis'
    line_start: '28'
    line_end: '31'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/lib/legacyAnamnesis.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.lib.legacyanamnesis.haslegacyanamnesis` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.legacyanamnesis.haslegacyanamnesis is the canonical typescript-function named hasLegacyAnamnesis.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/LegacyAnamnesisView.tsx`
- `frontend/src/lib/__tests__/legacyAnamnesis.test.ts`

## Invariants

The symbol is exported across its module boundary as `hasLegacyAnamnesis`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/legacyAnamnesis.ts:28-31` — hasLegacyAnamnesis

## Related Knowledge

- `belongs-to` → `project.frontend`
