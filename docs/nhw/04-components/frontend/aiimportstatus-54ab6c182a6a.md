---
id: "component.frontend.frontend.src.components.shared.aiimportstatus.aiimportstatus"
kind: "typescript-react-component"
title: "AIImportStatus"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/AIImportStatus.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/AIImportStatus.tsx"
    symbol: "AIImportStatus"
    line_start: "24"
    line_end: "87"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/AIImportStatus.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.aiimportstatus.aiimportstatus` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.aiimportstatus.aiimportstatus is the canonical typescript-react-component named AIImportStatus.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientList.tsx`

## Invariants

The symbol is exported across its module boundary as `AIImportStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AIImportStatus.tsx:24-87` — AIImportStatus

## Related Knowledge

- `belongs-to` → `project.frontend`
