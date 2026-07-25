---
id: "component.frontend.frontend.src.components.admin.operatormanagement.operatormanagement"
kind: "typescript-react-component"
title: "OperatorManagement"
status: "observed"
summary: "Exported react-component from frontend/src/components/admin/OperatorManagement.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/admin/OperatorManagement.tsx"
    symbol: "OperatorManagement"
    line_start: "133"
    line_end: "443"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/admin/OperatorManagement.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.operatormanagement.operatormanagement` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.operatormanagement.operatormanagement is the canonical typescript-react-component named OperatorManagement.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `OperatorManagement`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/OperatorManagement.tsx:133-443` — OperatorManagement

## Related Knowledge

- `belongs-to` → `project.frontend`
