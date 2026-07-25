---
id: "component.frontend.frontend.src.components.shared.confirmdialog.confirmdialog"
kind: "typescript-react-component"
title: "ConfirmDialog"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/ConfirmDialog.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/ConfirmDialog.tsx"
    symbol: "ConfirmDialog"
    line_start: "25"
    line_end: "90"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/ConfirmDialog.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.confirmdialog.confirmdialog` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.confirmdialog.confirmdialog is the canonical typescript-react-component named ConfirmDialog.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/RoomsManagement.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`

## Invariants

The symbol is exported across its module boundary as `ConfirmDialog`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/ConfirmDialog.tsx:25-90` — ConfirmDialog

## Related Knowledge

- `belongs-to` → `project.frontend`
