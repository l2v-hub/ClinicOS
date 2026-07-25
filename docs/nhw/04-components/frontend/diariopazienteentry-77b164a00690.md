---
id: "component.frontend.frontend.src.types.diariopazienteentry"
kind: "typescript-interface"
title: "DiarioPazienteEntry"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "DiarioPazienteEntry"
    line_start: "622"
    line_end: "635"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.diariopazienteentry` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.diariopazienteentry is the canonical typescript-interface named DiarioPazienteEntry.

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

The symbol is exported across its module boundary as `DiarioPazienteEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:622-635` — DiarioPazienteEntry

## Related Knowledge

- `belongs-to` → `project.frontend`
