---
id: "component.frontend.frontend.src.types.tipodocumento"
kind: "typescript-type-alias"
title: "TipoDocumento"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TipoDocumento"
    line_start: "554"
    line_end: "573"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.tipodocumento` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.tipodocumento is the canonical typescript-type-alias named TipoDocumento.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DocumentiTab.tsx`

## Invariants

The symbol is exported across its module boundary as `TipoDocumento`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:554-573` — TipoDocumento

## Related Knowledge

- `belongs-to` → `project.frontend`
