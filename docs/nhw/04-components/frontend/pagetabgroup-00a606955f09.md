---
id: "component.frontend.frontend.src.components.shared.navcomponents.pagetabgroup"
kind: "typescript-interface"
title: "PageTabGroup"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "PageTabGroup"
    line_start: "6"
    line_end: "10"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/NavComponents.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.pagetabgroup` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.pagetabgroup is the canonical typescript-interface named PageTabGroup.

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

The symbol is exported across its module boundary as `PageTabGroup`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:6-10` — PageTabGroup

## Related Knowledge

- `belongs-to` → `project.frontend`
