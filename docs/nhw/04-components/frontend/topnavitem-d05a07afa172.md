---
id: "component.frontend.frontend.src.components.navigation.topnav.topnavitem"
kind: "typescript-interface"
title: "TopNavItem"
status: "observed"
summary: "Exported interface from frontend/src/components/navigation/TopNav.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/navigation/TopNav.tsx"
    symbol: "TopNavItem"
    line_start: "3"
    line_end: "7"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/navigation/TopNav.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.navigation.topnav.topnavitem` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.navigation.topnav.topnavitem is the canonical typescript-interface named TopNavItem.

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

## Invariants

The symbol is exported across its module boundary as `TopNavItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/navigation/TopNav.tsx:3-7` — TopNavItem

## Related Knowledge

- `belongs-to` → `project.frontend`
