---
id: "component.frontend.frontend.src.components.shared.dischargeimportmodal.dischargeimportmodal"
kind: "typescript-react-component"
title: "DischargeImportModal"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/DischargeImportModal.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/DischargeImportModal.tsx"
    symbol: "DischargeImportModal"
    line_start: "86"
    line_end: "816"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DischargeImportModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.dischargeimportmodal.dischargeimportmodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.dischargeimportmodal.dischargeimportmodal is the canonical typescript-react-component named DischargeImportModal.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/AIImportStatus.tsx`

## Invariants

The symbol is exported across its module boundary as `DischargeImportModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/DischargeImportModal.tsx:86-816` — DischargeImportModal

## Related Knowledge

- `belongs-to` → `project.frontend`
