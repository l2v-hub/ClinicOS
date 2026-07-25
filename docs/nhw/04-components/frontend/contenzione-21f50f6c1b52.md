---
id: "component.frontend.frontend.src.types.contenzione"
kind: "typescript-interface"
title: "Contenzione"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Contenzione"
    line_start: "702"
    line_end: "746"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.types.contenzione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.contenzione is the canonical typescript-interface named Contenzione.

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

The symbol is exported across its module boundary as `Contenzione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:702-746` — Contenzione

## Related Knowledge

- `belongs-to` → `project.frontend`
