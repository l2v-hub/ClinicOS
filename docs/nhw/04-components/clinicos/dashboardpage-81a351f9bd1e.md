---
id: "component.src.src.pages.dashboardpage.dashboardpage"
kind: "typescript-react-component"
title: "DashboardPage"
status: "observed"
summary: "Exported react-component from src/pages/DashboardPage.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "src/pages/DashboardPage.tsx"
    symbol: "DashboardPage"
    line_start: "1"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "src/pages/DashboardPage.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.src.src.pages.dashboardpage.dashboardpage` represent in ClinicOS?

## Canonical Definition

component.src.src.pages.dashboardpage.dashboardpage is the canonical typescript-react-component named DashboardPage.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `DashboardPage`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `src/pages/DashboardPage.tsx:1-21` — DashboardPage

## Related Knowledge

- `belongs-to` → `project.clinicos`
