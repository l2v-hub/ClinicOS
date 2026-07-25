---
id: "component.frontend.frontend.src.components.shared.pageheader.pageheader"
kind: "typescript-react-component"
title: "PageHeader"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/PageHeader.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/PageHeader.tsx"
    symbol: "PageHeader"
    line_start: "16"
    line_end: "56"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/PageHeader.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.pageheader.pageheader` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.pageheader.pageheader is the canonical typescript-react-component named PageHeader.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/operator/MultiPatientParametri.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientList.tsx`

## Invariants

The symbol is exported across its module boundary as `PageHeader`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/PageHeader.tsx:16-56` — PageHeader

## Related Knowledge

- `belongs-to` → `project.frontend`
