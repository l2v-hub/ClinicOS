---
id: "component.frontend.frontend.src.components.operator.patientcompactheader.patientcompactheader"
kind: "typescript-react-component"
title: "PatientCompactHeader"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/PatientCompactHeader.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/PatientCompactHeader.tsx"
    symbol: "PatientCompactHeader"
    line_start: "16"
    line_end: "107"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/PatientCompactHeader.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.patientcompactheader.patientcompactheader` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.patientcompactheader.patientcompactheader is the canonical typescript-react-component named PatientCompactHeader.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `PatientCompactHeader`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/PatientCompactHeader.tsx:16-107` — PatientCompactHeader

## Related Knowledge

- `belongs-to` → `project.frontend`
