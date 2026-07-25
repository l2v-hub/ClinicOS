---
id: "component.frontend.frontend.src.icons.icosearch"
kind: "typescript-react-component"
title: "IcoSearch"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoSearch"
    line_start: "78"
    line_end: "90"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icosearch` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icosearch is the canonical typescript-react-component named IcoSearch.

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
- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/MultiPatientParametri.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/shared/NotesPage.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoSearch`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:78-90` — IcoSearch

## Related Knowledge

- `belongs-to` → `project.frontend`
