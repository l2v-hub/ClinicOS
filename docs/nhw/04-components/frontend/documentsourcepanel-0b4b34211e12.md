---
id: "component.frontend.frontend.src.components.shared.documentsourcepanel.documentsourcepanel"
kind: "typescript-react-component"
title: "DocumentSourcePanel"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/DocumentSourcePanel.tsx."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/DocumentSourcePanel.tsx"
    symbol: "DocumentSourcePanel"
    line_start: "33"
    line_end: "153"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DocumentSourcePanel.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.documentsourcepanel.documentsourcepanel` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.documentsourcepanel.documentsourcepanel is the canonical typescript-react-component named DocumentSourcePanel.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ImportedDocumentsList.tsx`
- `frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DocumentSourcePanel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/DocumentSourcePanel.tsx:33-153` — DocumentSourcePanel

## Related Knowledge

- `belongs-to` → `project.frontend`
