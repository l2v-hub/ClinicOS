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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
