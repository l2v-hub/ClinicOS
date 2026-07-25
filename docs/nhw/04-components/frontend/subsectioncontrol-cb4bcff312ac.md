---
id: "component.frontend.frontend.src.components.shared.navcomponents.subsectioncontrol"
kind: "typescript-react-component"
title: "SubSectionControl"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "SubSectionControl"
    line_start: "109"
    line_end: "137"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/NavComponents.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.subsectioncontrol` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.subsectioncontrol is the canonical typescript-react-component named SubSectionControl.

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

The symbol is exported across its module boundary as `SubSectionControl`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:109-137` — SubSectionControl

## Related Knowledge

- `belongs-to` → `project.frontend`
