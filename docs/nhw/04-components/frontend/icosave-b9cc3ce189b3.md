---
id: "component.frontend.frontend.src.icons.icosave"
kind: "typescript-react-component"
title: "IcoSave"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoSave"
    line_start: "364"
    line_end: "377"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icosave` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icosave is the canonical typescript-react-component named IcoSave.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/InlineEditableField.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoSave`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:364-377` — IcoSave

## Related Knowledge

- `belongs-to` → `project.frontend`
