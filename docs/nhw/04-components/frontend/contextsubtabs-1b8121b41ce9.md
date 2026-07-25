---
id: "component.frontend.frontend.src.components.shared.navcomponents.contextsubtabs"
kind: "typescript-react-component"
title: "ContextSubTabs"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "ContextSubTabs"
    line_start: "64"
    line_end: "87"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.contextsubtabs` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.contextsubtabs is the canonical typescript-react-component named ContextSubTabs.

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

The symbol is exported across its module boundary as `ContextSubTabs`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:64-87` — ContextSubTabs

## Related Knowledge

- `belongs-to` → `project.frontend`
