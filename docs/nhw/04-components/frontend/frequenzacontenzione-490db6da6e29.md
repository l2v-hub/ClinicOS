---
id: "component.frontend.frontend.src.types.frequenzacontenzione"
kind: "typescript-type-alias"
title: "FrequenzaContenzione"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "FrequenzaContenzione"
    line_start: "700"
    line_end: "700"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.types.frequenzacontenzione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.frequenzacontenzione is the canonical typescript-type-alias named FrequenzaContenzione.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`

## Invariants

The symbol is exported across its module boundary as `FrequenzaContenzione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:700-700` — FrequenzaContenzione

## Related Knowledge

- `belongs-to` → `project.frontend`
