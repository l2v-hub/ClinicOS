---
id: "component.frontend.frontend.src.components.navigation.topnav.topnav"
kind: "typescript-react-component"
title: "TopNav"
status: "observed"
summary: "Exported react-component from frontend/src/components/navigation/TopNav.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/navigation/TopNav.tsx"
    symbol: "TopNav"
    line_start: "24"
    line_end: "51"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/navigation/TopNav.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.navigation.topnav.topnav` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.navigation.topnav.topnav is the canonical typescript-react-component named TopNav.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/navigation/PageSecondaryNavigation.tsx`
- `frontend/src/components/navigation/PageTopNavigation.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `TopNav`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/navigation/TopNav.tsx:24-51` — TopNav

## Related Knowledge

- `belongs-to` → `project.frontend`
