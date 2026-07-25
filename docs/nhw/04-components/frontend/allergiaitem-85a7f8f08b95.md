---
id: "component.frontend.frontend.src.types.allergiaitem"
kind: "typescript-interface"
title: "AllergiaItem"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "AllergiaItem"
    line_start: "370"
    line_end: "378"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.types.allergiaitem` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.allergiaitem is the canonical typescript-interface named AllergiaItem.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`
- `frontend/src/components/shared/intake/StepClinica.tsx`
- `frontend/src/components/shared/intake/__tests__/confirmCartella.test.ts`
- `frontend/src/lib/__tests__/allergyStatusModel.test.ts`
- `frontend/src/lib/allergyStatusModel.ts`

## Invariants

The symbol is exported across its module boundary as `AllergiaItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:370-378` — AllergiaItem

## Related Knowledge

- `belongs-to` → `project.frontend`
