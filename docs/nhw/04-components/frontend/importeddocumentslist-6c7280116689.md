---
id: "component.frontend.frontend.src.components.operator.cartella.importeddocumentslist.importeddocumentslist"
kind: "typescript-react-component"
title: "ImportedDocumentsList"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/ImportedDocumentsList.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ImportedDocumentsList.tsx"
    symbol: "ImportedDocumentsList"
    line_start: "29"
    line_end: "115"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ImportedDocumentsList.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.importeddocumentslist.importeddocumentslist` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.importeddocumentslist.importeddocumentslist is the canonical typescript-react-component named ImportedDocumentsList.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DocumentiTab.tsx`

## Invariants

The symbol is exported across its module boundary as `ImportedDocumentsList`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ImportedDocumentsList.tsx:29-115` — ImportedDocumentsList

## Related Knowledge

- `belongs-to` → `project.frontend`
