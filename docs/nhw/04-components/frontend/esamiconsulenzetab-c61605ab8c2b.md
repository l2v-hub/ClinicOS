---
id: "component.frontend.frontend.src.components.operator.cartella.esamiconsulenzetab.esamiconsulenzetab"
kind: "typescript-react-component"
title: "EsamiConsulenzeTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx"
    symbol: "EsamiConsulenzeTab"
    line_start: "430"
    line_end: "496"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.esamiconsulenzetab.esamiconsulenzetab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.esamiconsulenzetab.esamiconsulenzetab is the canonical typescript-react-component named EsamiConsulenzeTab.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `EsamiConsulenzeTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx:430-496` — EsamiConsulenzeTab

## Related Knowledge

- `belongs-to` → `project.frontend`
