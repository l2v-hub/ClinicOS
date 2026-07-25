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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
