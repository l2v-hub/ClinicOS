---
id: "component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab"
kind: "typescript-react-component"
title: "NarrativeSectionsTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx"
    symbol: "NarrativeSectionsTab"
    line_start: "30"
    line_end: "133"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab is the canonical typescript-react-component named NarrativeSectionsTab.

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

The symbol is exported across its module boundary as `NarrativeSectionsTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx:30-133` — NarrativeSectionsTab

## Related Knowledge

- `belongs-to` → `project.frontend`
