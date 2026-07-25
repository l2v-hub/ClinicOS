---
id: 'component.frontend.frontend.src.components.shared.documentpreview.previewdoc'
kind: 'typescript-interface'
title: 'PreviewDoc'
status: 'observed'
summary: 'Exported interface from frontend/src/components/shared/DocumentPreview.tsx.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'frontend/src/components/shared/DocumentPreview.tsx'
    symbol: 'PreviewDoc'
    line_start: '8'
    line_end: '12'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/DocumentPreview.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.documentpreview.previewdoc` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.documentpreview.previewdoc is the canonical typescript-interface named PreviewDoc.

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

The symbol is exported across its module boundary as `PreviewDoc`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/DocumentPreview.tsx:8-12` — PreviewDoc

## Related Knowledge

- `belongs-to` → `project.frontend`
