---
id: "component.frontend.frontend.src.icons.icomappin"
kind: "typescript-react-component"
title: "IcoMapPin"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoMapPin"
    line_start: "490"
    line_end: "502"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icomappin` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icomappin is the canonical typescript-react-component named IcoMapPin.

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

The symbol is exported across its module boundary as `IcoMapPin`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:490-502` — IcoMapPin

## Related Knowledge

- `belongs-to` → `project.frontend`
