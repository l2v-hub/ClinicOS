---
id: "component.frontend.frontend.src.types.diarioentry"
kind: "typescript-interface"
title: "DiarioEntry"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "DiarioEntry"
    line_start: "596"
    line_end: "615"
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

What does `component.frontend.frontend.src.types.diarioentry` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.diarioentry is the canonical typescript-interface named DiarioEntry.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DiarioEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:596-615` — DiarioEntry

## Related Knowledge

- `belongs-to` → `project.frontend`
