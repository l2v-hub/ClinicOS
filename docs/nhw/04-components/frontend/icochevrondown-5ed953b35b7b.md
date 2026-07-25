---
id: "component.frontend.frontend.src.icons.icochevrondown"
kind: "typescript-react-component"
title: "IcoChevronDown"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoChevronDown"
    line_start: "142"
    line_end: "153"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icochevrondown` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icochevrondown is the canonical typescript-react-component named IcoChevronDown.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/ExpCard.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoChevronDown`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:142-153` — IcoChevronDown

## Related Knowledge

- `belongs-to` → `project.frontend`
