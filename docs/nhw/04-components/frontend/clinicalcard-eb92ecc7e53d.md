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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
