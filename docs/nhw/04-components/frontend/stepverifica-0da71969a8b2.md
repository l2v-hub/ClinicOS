---
id: "component.frontend.frontend.src.components.shared.intake.stepverifica.stepverifica"
kind: "typescript-react-component"
title: "StepVerifica"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/intake/StepVerifica.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/StepVerifica.tsx"
    symbol: "StepVerifica"
    line_start: "31"
    line_end: "256"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/StepVerifica.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.stepverifica.stepverifica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.stepverifica.stepverifica is the canonical typescript-react-component named StepVerifica.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`

## Invariants

The symbol is exported across its module boundary as `StepVerifica`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/StepVerifica.tsx:31-256` — StepVerifica

## Related Knowledge

- `belongs-to` → `project.frontend`
