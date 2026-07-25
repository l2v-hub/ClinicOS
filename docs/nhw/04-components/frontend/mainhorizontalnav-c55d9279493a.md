---
id: "component.frontend.frontend.src.components.shared.navcomponents.mainhorizontalnav"
kind: "typescript-react-component"
title: "MainHorizontalNav"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "MainHorizontalNav"
    line_start: "19"
    line_end: "42"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.mainhorizontalnav` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.mainhorizontalnav is the canonical typescript-react-component named MainHorizontalNav.

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

The symbol is exported across its module boundary as `MainHorizontalNav`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:19-42` — MainHorizontalNav

## Related Knowledge

- `belongs-to` → `project.frontend`
