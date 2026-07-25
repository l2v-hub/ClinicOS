---
id: "component.frontend.frontend.src.types.turnooperatore"
kind: "typescript-interface"
title: "TurnoOperatore"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TurnoOperatore"
    line_start: "237"
    line_end: "242"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.types.turnooperatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.turnooperatore is the canonical typescript-interface named TurnoOperatore.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `TurnoOperatore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:237-242` — TurnoOperatore

## Related Knowledge

- `belongs-to` → `project.frontend`
