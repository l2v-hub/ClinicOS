---
id: "component.frontend.frontend.src.components.shared.documentpreview.documentpreview"
kind: "typescript-react-component"
title: "DocumentPreview"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/DocumentPreview.tsx."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/DocumentPreview.tsx"
    symbol: "DocumentPreview"
    line_start: "23"
    line_end: "241"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DocumentPreview.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.documentpreview.documentpreview` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.documentpreview.documentpreview is the canonical typescript-react-component named DocumentPreview.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/DischargeImportModal.tsx`
- `frontend/src/components/shared/DocumentSourcePanel.tsx`

## Invariants

The symbol is exported across its module boundary as `DocumentPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/DocumentPreview.tsx:23-241` — DocumentPreview

## Related Knowledge

- `belongs-to` → `project.frontend`
