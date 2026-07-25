---
id: "component.frontend.frontend.src.components.shared.clinicalcard.clinicalcard"
kind: "typescript-react-component"
title: "ClinicalCard"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/ClinicalCard.tsx."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/ClinicalCard.tsx"
    symbol: "ClinicalCard"
    line_start: "14"
    line_end: "127"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/ClinicalCard.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.clinicalcard.clinicalcard` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.clinicalcard.clinicalcard is the canonical typescript-react-component named ClinicalCard.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `ClinicalCard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/ClinicalCard.tsx:14-127` — ClinicalCard

## Related Knowledge

- `belongs-to` → `project.frontend`
