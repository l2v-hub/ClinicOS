---
id: "component.frontend.frontend.src.icons.icouser"
kind: "typescript-react-component"
title: "IcoUser"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoUser"
    line_start: "298"
    line_end: "310"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icouser` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icouser is the canonical typescript-react-component named IcoUser.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/Login.tsx`
- `frontend/src/components/operator/PatientList.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoUser`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:298-310` — IcoUser

## Related Knowledge

- `belongs-to` → `project.frontend`
