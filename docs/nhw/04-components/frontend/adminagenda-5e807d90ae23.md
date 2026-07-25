---
id: "component.frontend.frontend.src.components.admin.adminagenda.adminagenda"
kind: "typescript-react-component"
title: "AdminAgenda"
status: "observed"
summary: "Exported react-component from frontend/src/components/admin/AdminAgenda.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/admin/AdminAgenda.tsx"
    symbol: "AdminAgenda"
    line_start: "83"
    line_end: "474"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/admin/AdminAgenda.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.adminagenda.adminagenda` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.adminagenda.adminagenda is the canonical typescript-react-component named AdminAgenda.

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

The symbol is exported across its module boundary as `AdminAgenda`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/AdminAgenda.tsx:83-474` — AdminAgenda

## Related Knowledge

- `belongs-to` → `project.frontend`
