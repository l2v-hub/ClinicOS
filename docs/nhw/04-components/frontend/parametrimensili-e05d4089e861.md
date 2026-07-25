---
id: "component.frontend.frontend.src.types.parametrimensili"
kind: "typescript-interface"
title: "ParametriMensili"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "ParametriMensili"
    line_start: "653"
    line_end: "659"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.types.parametrimensili` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.parametrimensili is the canonical typescript-interface named ParametriMensili.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/MultiPatientParametri.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`

## Invariants

The symbol is exported across its module boundary as `ParametriMensili`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:653-659` — ParametriMensili

## Related Knowledge

- `belongs-to` → `project.frontend`
