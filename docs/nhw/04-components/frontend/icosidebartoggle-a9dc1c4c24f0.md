---
id: "component.frontend.frontend.src.icons.icosidebartoggle"
kind: "typescript-react-component"
title: "IcoSidebarToggle"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoSidebarToggle"
    line_start: "246"
    line_end: "270"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icosidebartoggle` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icosidebartoggle is the canonical typescript-react-component named IcoSidebarToggle.

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

The symbol is exported across its module boundary as `IcoSidebarToggle`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:246-270` — IcoSidebarToggle

## Related Knowledge

- `belongs-to` → `project.frontend`
