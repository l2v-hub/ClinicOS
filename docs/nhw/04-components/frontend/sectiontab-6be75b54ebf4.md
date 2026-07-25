---
id: "component.frontend.frontend.src.components.shared.navcomponents.sectiontab"
kind: "typescript-interface"
title: "SectionTab"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/NavComponents.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/NavComponents.tsx"
    symbol: "SectionTab"
    line_start: "50"
    line_end: "55"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.navcomponents.sectiontab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.navcomponents.sectiontab is the canonical typescript-interface named SectionTab.

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

The symbol is exported across its module boundary as `SectionTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/NavComponents.tsx:50-55` — SectionTab

## Related Knowledge

- `belongs-to` → `project.frontend`
