---
id: "component.frontend.frontend.src.icons.icowarning"
kind: "typescript-react-component"
title: "IcoWarning"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoWarning"
    line_start: "271"
    line_end: "284"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icowarning` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icowarning is the canonical typescript-react-component named IcoWarning.

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
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/shared/ConfirmDialog.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoWarning`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:271-284` — IcoWarning

## Related Knowledge

- `belongs-to` → `project.frontend`
