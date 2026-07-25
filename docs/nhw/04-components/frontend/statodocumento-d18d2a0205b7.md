---
id: "component.frontend.frontend.src.types.statodocumento"
kind: "typescript-type-alias"
title: "StatoDocumento"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/types.ts"
    symbol: "StatoDocumento"
    line_start: "575"
    line_end: "575"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.statodocumento` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.statodocumento is the canonical typescript-type-alias named StatoDocumento.

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

The symbol is exported across its module boundary as `StatoDocumento`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:575-575` — StatoDocumento

## Related Knowledge

- `belongs-to` → `project.frontend`
