---
id: "component.frontend.frontend.src.icons.icoclockfill"
kind: "typescript-react-component"
title: "IcoClockFill"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoClockFill"
    line_start: "285"
    line_end: "297"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icoclockfill` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoclockfill is the canonical typescript-react-component named IcoClockFill.

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

The symbol is exported across its module boundary as `IcoClockFill`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:285-297` — IcoClockFill

## Related Knowledge

- `belongs-to` → `project.frontend`
