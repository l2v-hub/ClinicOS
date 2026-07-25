---
id: "component.frontend.frontend.src.components.navigation.pagesecondarynavigation.pagesecondarynavigation"
kind: "typescript-react-component"
title: "PageSecondaryNavigation"
status: "observed"
summary: "Exported react-component from frontend/src/components/navigation/PageSecondaryNavigation.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/navigation/PageSecondaryNavigation.tsx"
    symbol: "PageSecondaryNavigation"
    line_start: "17"
    line_end: "19"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/navigation/PageSecondaryNavigation.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.navigation.pagesecondarynavigation.pagesecondarynavigation` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.navigation.pagesecondarynavigation.pagesecondarynavigation is the canonical typescript-react-component named PageSecondaryNavigation.

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

The symbol is exported across its module boundary as `PageSecondaryNavigation`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/navigation/PageSecondaryNavigation.tsx:17-19` — PageSecondaryNavigation

## Related Knowledge

- `belongs-to` → `project.frontend`
