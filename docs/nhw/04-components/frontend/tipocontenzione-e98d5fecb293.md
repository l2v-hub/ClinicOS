---
id: "component.frontend.frontend.src.types.tipocontenzione"
kind: "typescript-type-alias"
title: "TipoContenzione"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TipoContenzione"
    line_start: "699"
    line_end: "699"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.tipocontenzione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.tipocontenzione is the canonical typescript-type-alias named TipoContenzione.

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

The symbol is exported across its module boundary as `TipoContenzione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:699-699` — TipoContenzione

## Related Knowledge

- `belongs-to` → `project.frontend`
