---
id: "component.frontend.frontend.src.types.vitaleitem"
kind: "typescript-interface"
title: "VitaleItem"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "VitaleItem"
    line_start: "417"
    line_end: "426"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.vitaleitem` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.vitaleitem is the canonical typescript-interface named VitaleItem.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/cartella/ParametriModuloView.tsx`

## Invariants

The symbol is exported across its module boundary as `VitaleItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:417-426` — VitaleItem

## Related Knowledge

- `belongs-to` → `project.frontend`
