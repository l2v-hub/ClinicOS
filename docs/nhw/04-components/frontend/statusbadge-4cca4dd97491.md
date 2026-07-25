---
id: "component.frontend.frontend.src.components.shared.statusbadge.statusbadge"
kind: "typescript-react-component"
title: "StatusBadge"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/StatusBadge.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/StatusBadge.tsx"
    symbol: "StatusBadge"
    line_start: "19"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/StatusBadge.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.statusbadge.statusbadge` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.statusbadge.statusbadge is the canonical typescript-react-component named StatusBadge.

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

The symbol is exported across its module boundary as `StatusBadge`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/StatusBadge.tsx:19-22` — StatusBadge

## Related Knowledge

- `belongs-to` → `project.frontend`
