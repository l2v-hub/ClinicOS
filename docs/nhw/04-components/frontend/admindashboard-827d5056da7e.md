---
id: "component.frontend.frontend.src.components.admin.admindashboard.admindashboard"
kind: "typescript-react-component"
title: "AdminDashboard"
status: "observed"
summary: "Exported react-component from frontend/src/components/admin/AdminDashboard.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/admin/AdminDashboard.tsx"
    symbol: "AdminDashboard"
    line_start: "38"
    line_end: "446"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/admin/AdminDashboard.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.admindashboard.admindashboard` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.admindashboard.admindashboard is the canonical typescript-react-component named AdminDashboard.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `AdminDashboard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/AdminDashboard.tsx:38-446` — AdminDashboard

## Related Knowledge

- `belongs-to` → `project.frontend`
