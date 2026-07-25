---
id: "component.frontend.frontend.src.components.shared.navcomponents.pagetabs"
kind: "typescript-constant"
title: "PageTabs"
status: "observed"
summary: "Exported constant from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "PageTabs"
    line_start: "45"
    line_end: "45"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/NavComponents.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.pagetabs` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.pagetabs is the canonical typescript-constant named PageTabs.

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

The symbol is exported across its module boundary as `PageTabs`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:45-45` — PageTabs

## Related Knowledge

- `belongs-to` → `project.frontend`
