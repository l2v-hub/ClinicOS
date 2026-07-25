---
id: "component.frontend.frontend.src.components.shared.intake.stepclinica.stepclinica"
kind: "typescript-react-component"
title: "StepClinica"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/intake/StepClinica.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/StepClinica.tsx"
    symbol: "StepClinica"
    line_start: "61"
    line_end: "180"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/StepClinica.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.stepclinica.stepclinica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.stepclinica.stepclinica is the canonical typescript-react-component named StepClinica.

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

The symbol is exported across its module boundary as `StepClinica`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/StepClinica.tsx:61-180` — StepClinica

## Related Knowledge

- `belongs-to` → `project.frontend`
