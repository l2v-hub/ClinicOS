---
id: "component.frontend.frontend.src.components.navigation.pagetopnavigation.pagetopnavigation"
kind: "typescript-react-component"
title: "PageTopNavigation"
status: "observed"
summary: "Exported react-component from frontend/src/components/navigation/PageTopNavigation.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/navigation/PageTopNavigation.tsx"
    symbol: "PageTopNavigation"
    line_start: "16"
    line_end: "18"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/navigation/PageTopNavigation.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.navigation.pagetopnavigation.pagetopnavigation` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.navigation.pagetopnavigation.pagetopnavigation is the canonical typescript-react-component named PageTopNavigation.

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

The symbol is exported across its module boundary as `PageTopNavigation`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/navigation/PageTopNavigation.tsx:16-18` — PageTopNavigation

## Related Knowledge

- `belongs-to` → `project.frontend`
