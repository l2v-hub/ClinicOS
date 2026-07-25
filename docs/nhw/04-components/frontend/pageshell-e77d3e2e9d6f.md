---
id: "component.frontend.frontend.src.components.shared.pageshell.pageshell"
kind: "typescript-react-component"
title: "PageShell"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/PageShell.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/PageShell.tsx"
    symbol: "PageShell"
    line_start: "16"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/PageShell.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.pageshell.pageshell` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.pageshell.pageshell is the canonical typescript-react-component named PageShell.

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

The symbol is exported across its module boundary as `PageShell`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/PageShell.tsx:16-23` — PageShell

## Related Knowledge

- `belongs-to` → `project.frontend`
