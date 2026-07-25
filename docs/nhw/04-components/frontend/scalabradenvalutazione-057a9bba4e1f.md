---
id: "component.frontend.frontend.src.types.scalabradenvalutazione"
kind: "typescript-interface"
title: "ScalaBradenValutazione"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "ScalaBradenValutazione"
    line_start: "750"
    line_end: "762"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.types.scalabradenvalutazione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.scalabradenvalutazione is the canonical typescript-interface named ScalaBradenValutazione.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`

## Invariants

The symbol is exported across its module boundary as `ScalaBradenValutazione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:750-762` — ScalaBradenValutazione

## Related Knowledge

- `belongs-to` → `project.frontend`
