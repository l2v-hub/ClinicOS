---
id: "component.frontend.frontend.src.components.operator.patientlist.patientlist"
kind: "typescript-react-component"
title: "PatientList"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/PatientList.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/PatientList.tsx"
    symbol: "PatientList"
    line_start: "142"
    line_end: "534"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/PatientList.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.patientlist.patientlist` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.patientlist.patientlist is the canonical typescript-react-component named PatientList.

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

The symbol is exported across its module boundary as `PatientList`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/PatientList.tsx:142-534` — PatientList

## Related Knowledge

- `belongs-to` → `project.frontend`
